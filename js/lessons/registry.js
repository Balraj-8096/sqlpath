// Lesson content registry. Content files call Lessons.add([...]); see tools/CONTENT_GUIDE.md.
window.Lessons = {
  data: {},
  add(list) { (Array.isArray(list) ? list : [list]).forEach((l) => { this.data[l.id] = l; }); },
  get(id) { return this.data[id] || null; },
};
