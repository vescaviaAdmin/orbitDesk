import env from "../config/env.js";
import {
  sendLoginOtpEmail,
  sendPasswordSetupEmail,
} from "../config/mailSender.js";
import { uploadFileToCloudinary } from "../services/cloudinary.js";
import Client, { validateClientSignupFields } from "../schema/clientSchema.js";
import {
  createRandomToken,
  generateOtp,
  hashPassword,
  hashValue,
  isEmail,
  verifyPassword,
} from "../utils/auth.js";

const allowedAgreementTypes = new Set(["application/pdf"]);
const allowedGovIdTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function collectSignupData(request) {
  const fields = {};
  const files = {};

  for await (const part of request.parts()) {
    if (part.type === "file") {
      const buffer = await part.toBuffer();

      files[part.fieldname] = {
        fileName: part.filename,
        mimeType: part.mimetype,
        buffer,
      };

      continue;
    }

    fields[part.fieldname] = part.value;
  }

  return { fields, files };
}

function validateFiles(files) {
  if (!files.signedAgreementCopy) {
    return "signedAgreementCopy is required";
  }

  if (!files.govId) {
    return "govId is required";
  }

  if (!allowedAgreementTypes.has(files.signedAgreementCopy.mimeType)) {
    return "signedAgreementCopy must be a PDF";
  }

  if (!allowedGovIdTypes.has(files.govId.mimeType)) {
    return "govId must be a PDF or image";
  }

  return null;
}

function buildClientLookup(identifier) {
  const normalizedIdentifier = identifier.trim();

  if (isEmail(normalizedIdentifier)) {
    return { email: normalizedIdentifier.toLowerCase() };
  }

  return { username: normalizedIdentifier };
}

function validatePasswordInput(password, confirmPassword) {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }

  if (password !== confirmPassword) {
    return "Password and confirm password must match";
  }

  return null;
}

export async function createClientSignup(request, reply) {
  if (!env.cloudinaryUrl) {
    return reply.code(500).send({
      message: "CLOUDINARY_URL is missing in server .env",
    });
  }

  const { fields, files } = await collectSignupData(request);
  request.log.info(
    {
      email: fields.email,
      username: fields.username,
    },
    "Processing client signup request"
  );

  const fieldError = validateClientSignupFields(fields);

  if (fieldError) {
    request.log.warn({ fieldError }, "Client signup field validation failed");
    return reply.code(400).send({
      message: fieldError,
    });
  }

  const fileError = validateFiles(files);

  if (fileError) {
    request.log.warn({ fileError }, "Client signup file validation failed");
    return reply.code(400).send({
      message: fileError,
    });
  }

  const existingClient = await Client.findOne({
    $or: [
      { email: fields.email.trim().toLowerCase() },
      { username: fields.username.trim() },
    ],
  });

  if (existingClient) {
    request.log.warn(
      {
        email: fields.email,
        username: fields.username,
      },
      "Duplicate client signup blocked"
    );
    return reply.code(409).send({
      message: "A client with this email or username already exists",
    });
  }

  request.log.info("Uploading signed agreement to Cloudinary");
  const signedAgreementCopy = await uploadFileToCloudinary({
    ...files.signedAgreementCopy,
    folder: "agreements",
  });

  request.log.info("Uploading government ID to Cloudinary");
  const govId = await uploadFileToCloudinary({
    ...files.govId,
    folder: "government-ids",
  });

  const passwordSetupToken = createRandomToken();
  const passwordSetupTokenHash = hashValue(passwordSetupToken);
  const passwordSetupExpiresAt = new Date(Date.now() + 1000 * 60 * 60);

  let clientDocument;

  try {
    clientDocument = await Client.create({
      clientName: fields.clientName,
      companyName: fields.companyName,
      companyLocation: fields.companyLocation,
      companyWebsite: fields.companyWebsite,
      projectName: fields.projectName,
      username: fields.username,
      email: fields.email,
      documents: {
        signedAgreementCopyUrl: signedAgreementCopy.url,
        signedAgreementCopyPublicId: signedAgreementCopy.publicId,
        govIdUrl: govId.url,
        govIdPublicId: govId.publicId,
      },
      auth: {
        passwordSetupTokenHash,
        passwordSetupExpiresAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return reply.code(409).send({
        message: "A client with this email or username already exists",
      });
    }

    throw error;
  }

  const setupLink = `${env.clientAppUrl}?mode=set-password&token=${passwordSetupToken}&email=${encodeURIComponent(clientDocument.email)}`;

  request.log.info(
    {
      clientId: clientDocument._id.toString(),
      email: clientDocument.email,
    },
    "Sending password setup email"
  );

  await sendPasswordSetupEmail({
    to: clientDocument.email,
    clientName: clientDocument.clientName,
    setupLink,
  });

  request.log.info(
    {
      clientId: clientDocument._id.toString(),
      email: clientDocument.email,
    },
    "Client signup saved successfully"
  );

  return reply.code(201).send({
    message: "Client account created successfully. Password setup email sent.",
    data: {
      clientId: clientDocument._id.toString(),
      email: clientDocument.email,
      setupLink,
      signedAgreementCopyUrl: clientDocument.documents.signedAgreementCopyUrl,
      govIdUrl: clientDocument.documents.govIdUrl,
    },
  });
}

export async function setClientPassword(request, reply) {
  const { token, email, password, confirmPassword } = request.body || {};

  if (!token || !email) {
    return reply.code(400).send({
      message: "token and email are required",
    });
  }

  const passwordError = validatePasswordInput(password, confirmPassword);

  if (passwordError) {
    return reply.code(400).send({
      message: passwordError,
    });
  }

  const client = await Client.findOne({
    email: String(email).trim().toLowerCase(),
    "auth.passwordSetupTokenHash": hashValue(String(token)),
    "auth.passwordSetupExpiresAt": { $gt: new Date() },
  });

  if (!client) {
    return reply.code(400).send({
      message: "Password setup link is invalid or expired",
    });
  }

  const hashedPassword = hashPassword(password);

  client.auth.passwordHash = hashedPassword.hash;
  client.auth.passwordSalt = hashedPassword.salt;
  client.auth.passwordSetupTokenHash = "";
  client.auth.passwordSetupExpiresAt = null;
  client.auth.passwordSetAt = new Date();

  await client.save();

  request.log.info(
    {
      clientId: client._id.toString(),
      email: client.email,
    },
    "Client password set successfully"
  );

  return reply.code(200).send({
    message: "Password set successfully",
  });
}

export async function requestClientLoginOtp(request, reply) {
  const { identifier, password } = request.body || {};

  if (!identifier || !password) {
    return reply.code(400).send({
      message: "identifier and password are required",
    });
  }

  const client = await Client.findOne(buildClientLookup(String(identifier)));

  if (!client || !client.auth.passwordHash || !client.auth.passwordSalt) {
    return reply.code(401).send({
      message: "Invalid credentials",
    });
  }

  const isPasswordValid = verifyPassword(
    String(password),
    client.auth.passwordSalt,
    client.auth.passwordHash
  );

  if (!isPasswordValid) {
    return reply.code(401).send({
      message: "Invalid credentials",
    });
  }

  const otp = generateOtp();

  client.auth.loginOtpHash = hashValue(otp);
  client.auth.loginOtpExpiresAt = new Date(Date.now() + 1000 * 60 * 10);
  client.auth.pendingLoginAt = new Date();

  await client.save();

  request.log.info(
    {
      clientId: client._id.toString(),
      email: client.email,
    },
    "Sending login OTP email"
  );

  await sendLoginOtpEmail({
    to: client.email,
    clientName: client.clientName,
    otp,
  });

  return reply.code(200).send({
    message: "OTP sent to your email",
    data: {
      email: client.email,
      identifier: isEmail(String(identifier))
        ? String(identifier).trim().toLowerCase()
        : String(identifier).trim(),
    },
  });
}

export async function verifyClientLoginOtp(request, reply) {
  const { identifier, otp } = request.body || {};

  if (!identifier || !otp) {
    return reply.code(400).send({
      message: "identifier and otp are required",
    });
  }

  const client = await Client.findOne(buildClientLookup(String(identifier)));

  if (
    !client ||
    !client.auth.loginOtpHash ||
    !client.auth.loginOtpExpiresAt ||
    client.auth.loginOtpExpiresAt <= new Date()
  ) {
    return reply.code(400).send({
      message: "OTP is invalid or expired",
    });
  }

  if (client.auth.loginOtpHash !== hashValue(String(otp).trim())) {
    return reply.code(400).send({
      message: "OTP is invalid or expired",
    });
  }

  client.auth.loginOtpHash = "";
  client.auth.loginOtpExpiresAt = null;
  client.auth.pendingLoginAt = null;

  await client.save();

  request.log.info(
    {
      clientId: client._id.toString(),
      email: client.email,
    },
    "Client login verified successfully"
  );

  return reply.code(200).send({
    message: "Login successful",
    data: {
      clientId: client._id.toString(),
      clientName: client.clientName,
      email: client.email,
      username: client.username,
    },
  });
}
