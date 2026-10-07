const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const input = process.argv[2] || "Volker_CEAIO_Master.xlsx";
const output = process.argv[3] || "data/ceaio_masterdata.json";

const wb = XLSX.readFile(input);
function rows(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Fehlendes Tabellenblatt: ${sheetName}`);
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

const matrix = rows("MASTER-MATRIX");
const courses = rows("KURSE");
const logic = rows("FRAGEN & LOGIK");

// Course-to-skill mapping is read from the KURSE sheet, not from a fixed
// number of "Kurs 1 ... Kurs 10" columns. This keeps future course additions
// uncapped as long as the course is assigned to a question/skill ID in KURSE.
const courseList = [];
const coursesByQuestionId = new Map();

for (const c of courses) {
  const skillRefs = String(c["Abgedeckte Skills"] || "")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const questionIds = [...new Set(skillRefs.map(ref => {
    const m = ref.match(/^([A-Z]{2}-[1-5])\b/);
    return m ? m[1] : null;
  }).filter(Boolean))];

  const course = {
    id: c["Kurs-ID"],
    provider: c["Anbieter"],
    name: c["Kursname"],
    competencyAreas: String(c["Abgedeckte Kompetenzbereiche"] || "").split("\n").filter(Boolean),
    skills: skillRefs,
    skillCount: Number(c["Anzahl Skills"] || 0),
    mappingStatus: c["Prüfstatus Skill-Zuordnung"],
    availability: c["Verfügbarkeit / nächster Termin"],
    delivery: c["Durchführung"],
    booking: c["Buchung / Zugang"],
    url: c["Aktueller Kurslink"],
    checkedAt: c["Geprüft am"],
    note: c["Hinweis"]
  };
  courseList.push(course);

  for (const qid of questionIds) {
    if (!coursesByQuestionId.has(qid)) coursesByQuestionId.set(qid, []);
    coursesByQuestionId.get(qid).push(course.id);
  }
}

const logicById = new Map(logic.map(x => [x["Frage-ID"], x]));
const questions = matrix.map(m => {
  const qid = m["Frage-ID"];
  const l = logicById.get(qid);
  if (!l) throw new Error(`Keine Bewertungslogik für ${qid}`);
  return {
    id: qid,
    competencyArea: m["Kompetenzbereich"],
    question: m["Frage"],
    skill: m["Skill"],
    courseIds: coursesByQuestionId.get(qid) || [],
    scoring: {
      "5": l["Antwort 5"],
      "4": l["Antwort 4"],
      "1-3": l["Antwort 1–3"]
    }
  };
});

if (questions.length !== 55) throw new Error(`Erwartet 55 Fragen, gefunden ${questions.length}`);
if (!courseList.length) throw new Error("Keine Kurse in der Masterdatei gefunden.");
if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error("Doppelte Frage-ID gefunden.");
if (new Set(courseList.map(c => c.id)).size !== courseList.length) throw new Error("Doppelte Kurs-ID gefunden.");
if (questions.some(q => q.courseIds.length === 0)) throw new Error("Mindestens ein Skill hat keinen zugeordneten Kurs.");
const knownQuestionIds = new Set(questions.map(q => q.id));
const unknownMappings = [...coursesByQuestionId.keys()].filter(id => !knownQuestionIds.has(id));
if (unknownMappings.length) throw new Error(`Unbekannte Frage-/Skill-ID in KURSE: ${unknownMappings.join(", ")}`);

const payload = {
  schemaVersion: "1.0",
  source: path.basename(input),
  rules: {
    score5: "no_training",
    score4: "optional_refresh",
    score1to3: "training_need",
    courseLimit: null,
    deduplicateCourses: true
  },
  questions,
  courses: courseList
};

fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output, `window.CEAIO_MASTER_DATA = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`OK: ${questions.length} Fragen, ${courseList.length} Kurse -> ${output}`);
