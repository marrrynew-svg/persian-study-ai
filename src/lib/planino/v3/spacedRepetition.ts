/** Simple spaced repetition intervals in days after first study. */
export const SR_INTERVALS = [1, 3, 7, 16];

export function scheduleReviews(startDate: string, subjectName: string, subjectId?: string) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  return SR_INTERVALS.map((offset) => {
    const d = new Date(start.getTime() + offset * 86400000);
    return {
      date: d.toISOString().slice(0, 10),
      subject_name: subjectName,
      subject_input_id: subjectId,
      offset,
    };
  });
}