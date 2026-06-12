export function normalizeMemberSkills(skills = []) {
  if (!Array.isArray(skills)) {
    return [];
  }

  return skills
    .map((skill) => ({
      name: String(skill?.name || "").trim(),
      rating: Math.min(5, Math.max(1, Number(skill?.rating) || 1)),
    }))
    .filter((skill) => skill.name);
}

export function normalizeMemberCourses(courses = []) {
  if (!Array.isArray(courses)) {
    return [];
  }

  return courses
    .map((course) => ({
      title: String(course?.title || "").trim(),
      provider: String(course?.provider || "").trim(),
      url: String(course?.url || "").trim(),
      note: String(course?.note || "").trim(),
    }))
    .filter((course) => course.title || course.provider || course.url || course.note);
}
