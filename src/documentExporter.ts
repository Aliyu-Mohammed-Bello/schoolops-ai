import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { getStudents, getResultsByStudent, getResultsByClass, getLowAttendance, fetchTimetable, roundToTwoSigFigs } from './backendTools';
import db from './db';

// Shared styling helper for PDF
function addPDFHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string) {
  // Logo placeholder or styling accent
  doc.rect(50, 40, 512, 10).fill('#3B82F6');
  doc.moveDown(1.5);
  
  doc.fillColor('#0B0E17').fontSize(22).font('Helvetica-Bold').text('SCHOOLOPS AI');
  doc.fontSize(10).font('Helvetica').fillColor('#5C6478').text('VIRTUAL SCHOOL ADMINISTRATION PORTAL · DEEP INTELLIGENCE');
  doc.moveDown(0.5);
  
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E293B').text(title.toUpperCase());
  if (subtitle) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#475569').text(subtitle);
  }
  doc.moveDown(1);
  doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(1.5);
}

function addPDFFooter(doc: PDFKit.PDFDocument) {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font('Helvetica').fillColor('#9AA3B8');
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(50, 740).lineTo(562, 740).stroke();
    doc.text(`Page ${i + 1} of ${pageCount}`, 50, 750, { align: 'left', width: 512 });
    doc.text('CONFIDENTIAL - SCHOOLOPS AI ADMINISTRATIVE EXPORT', 50, 750, { align: 'right', width: 512 });
  }
}

// PDF EXPORTER
export function generatePDF(type: string, className: string | undefined, res: any) {
  const doc = new PDFDocument({ margin: 50, bufferPages: true });
  let filename = `${type}_export.pdf`;

  res.setHeader('Content-Type', 'application/pdf');

  if (type === 'timetable') {
    filename = `timetable_${className || 'class'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addPDFHeader(doc, `CLASS TIMETABLE: ${className || 'ALL'}`);
    const timetable = fetchTimetable(className || 'JSS1');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Draw Timetable Grid
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#1E293B');
    
    // Header Row
    let y = doc.y;
    doc.rect(50, y, 512, 20).fill('#F1F5F9');
    doc.fillColor('#1E293B').text('Period / Time', 55, y + 5, { width: 100 });
    
    let xOffset = 155;
    const colWidth = 75;
    for (const d of days) {
      doc.text(d, xOffset, y + 5, { width: colWidth, align: 'center' });
      xOffset += colWidth;
    }
    doc.moveDown(1.5);

    // Grid rows
    let timeIndex = 0;
    for (const t of timetable.times) {
      y = doc.y;
      
      // Highlight breaks
      const isBreak = t.includes('BREAK');
      if (isBreak) {
        doc.rect(50, y, 512, 18).fill('#F8FAFC');
        doc.fillColor('#475569').font('Helvetica-Oblique').fontSize(9).text(t, 55, y + 4, { align: 'center', width: 490 });
        doc.moveDown(1.2);
        continue;
      }

      // Normal slot row
      doc.rect(50, y, 512, 24).fill(timeIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
      doc.fillColor('#0F172A').font('Helvetica').fontSize(8).text(t, 55, y + 8, { width: 100 });

      xOffset = 155;
      for (const d of days) {
        const slot = timetable.grid[d][timeIndex];
        if (slot) {
          doc.fillColor('#1E3A8A').font('Helvetica-Bold').text(slot.subject, xOffset, y + 4, { width: colWidth, align: 'center' });
          doc.fillColor('#475569').font('Helvetica').fontSize(7).text(slot.teacher_name, xOffset, y + 14, { width: colWidth, align: 'center' });
        } else {
          doc.fillColor('#94A3B8').font('Helvetica-Oblique').text('-', xOffset, y + 8, { width: colWidth, align: 'center' });
        }
        xOffset += colWidth;
      }
      doc.moveDown(1.8);
      timeIndex++;
    }

  } else if (type === 'student') {
    filename = 'student_report.pdf';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addPDFHeader(doc, 'STUDENT REPORT', 'Grouped by class, including academic & attendance rates');
    const students = getStudents();
    const classes = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];

    for (const cls of classes) {
      const clsStudents = students.filter(s => s.class === cls);
      if (clsStudents.length === 0) continue;

      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1E3A8A').text(`CLASS: ${cls}`);
      doc.moveDown(0.3);
      
      let y = doc.y;
      doc.rect(50, y, 512, 18).fill('#E2E8F0');
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8);
      doc.text('ID', 55, y + 5, { width: 60 });
      doc.text('FULL NAME', 115, y + 5, { width: 140 });
      doc.text('ATTENDANCE', 255, y + 5, { width: 80 });
      doc.text('GRADES SUMMARY / SCORE AVG', 335, y + 5, { width: 180 });
      doc.moveDown(1);

      let alt = false;
      for (const s of clsStudents) {
        y = doc.y;
        doc.rect(50, y, 512, 20).fill(alt ? '#F8FAFC' : '#FFFFFF');
        alt = !alt;

        doc.fillColor('#334155').font('Helvetica').fontSize(8);
        doc.text(s.student_id, 55, y + 6);
        doc.text(s.full_name, 115, y + 6);
        doc.text(`${s.attendance_rate}%`, 255, y + 6);

        const results = getResultsByStudent(s.student_id);
        if (results.length > 0) {
          const avg = roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length);
          const grades = results.map(r => `${r.subject} (${r.grade})`).join(', ');
          doc.text(`Avg: ${avg}% | ${grades}`, 335, y + 6, { width: 220 });
        } else {
          doc.text('No results recorded', 335, y + 6);
        }
        doc.moveDown(1.2);
      }
      doc.moveDown(1.5);
    }

  } else if (type === 'class') {
    const cls = className || 'JSS1';
    filename = `class_report_${cls}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addPDFHeader(doc, `CLASS LEVEL PERFORMANCE SUMMARY: ${cls}`, `Detailed academic & attendance breakdown for class ${cls}`);
    const students = getStudents().filter(s => s.class === cls);
    const results = getResultsByClass(cls);

    if (students.length === 0) {
      doc.fontSize(12).font('Helvetica-Bold').text(`No student records found for class ${cls}`);
    } else {
      const avgAtt = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
      const avgScore = results.length > 0 ? roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

      // Summary Metrics Cards
      let y = doc.y;
      doc.rect(50, y, 150, 50).fill('#EFF6FF');
      doc.rect(210, y, 150, 50).fill('#ECFDF5');
      doc.rect(370, y, 152, 50).fill('#F5F3FF');

      doc.fillColor('#1E40AF').fontSize(8).font('Helvetica-Bold').text('TOTAL STUDENTS', 60, y + 8);
      doc.fontSize(16).text(String(students.length), 60, y + 22);

      doc.fillColor('#065F46').fontSize(8).text('AVG ATTENDANCE', 220, y + 8);
      doc.fontSize(16).text(`${avgAtt}%`, 220, y + 22);

      doc.fillColor('#5B21B6').fontSize(8).text('AVG SUBJECT SCORE', 380, y + 8);
      doc.fontSize(16).text(`${avgScore}%`, 380, y + 22);

      doc.moveDown(4);

      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('STUDENT BREAKDOWN');
      doc.moveDown(0.5);

      y = doc.y;
      doc.rect(50, y, 512, 18).fill('#E2E8F0');
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8);
      doc.text('STUDENT', 55, y + 5, { width: 150 });
      doc.text('ATTENDANCE', 215, y + 5, { width: 80 });
      doc.text('AVERAGE SCORE', 305, y + 5, { width: 100 });
      doc.text('ACADEMIC RECORDS', 415, y + 5, { width: 140 });
      doc.moveDown(1);

      let alt = false;
      for (const s of students) {
        y = doc.y;
        doc.rect(50, y, 512, 20).fill(alt ? '#F8FAFC' : '#FFFFFF');
        alt = !alt;

        doc.fillColor('#334155').font('Helvetica').fontSize(8);
        doc.text(`${s.student_id} · ${s.full_name}`, 55, y + 6);
        doc.text(`${s.attendance_rate}%`, 215, y + 6);

        const sResults = results.filter(r => r.student_id === s.student_id);
        const sAvg = sResults.length > 0 ? roundToTwoSigFigs(sResults.reduce((acc, r) => acc + r.score, 0) / sResults.length) : 0;

        doc.text(sResults.length > 0 ? `${sAvg}%` : 'N/A', 305, y + 6);
        doc.text(sResults.length > 0 ? sResults.map(r => `${r.subject} (${r.grade})`).join(', ') : 'No data', 415, y + 6, { width: 140 });

        doc.moveDown(1.2);
      }
    }

  } else if (type === 'attendance') {
    filename = 'attendance_report.pdf';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addPDFHeader(doc, 'ATTENDANCE SUMMARY REPORT', 'School-wide attendance review & critical focus list');
    const students = getStudents();
    const overallAvg = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
    const lowAtt = getLowAttendance(75);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('SUMMARY METRICS');
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`School-wide Attendance Average: ${overallAvg}%`);
    doc.text(`Students Under 75% Threshold: ${lowAtt.length} students`);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('CRITICAL REVIEW (STUDENTS UNDER ATTENTION)');
    doc.moveDown(0.5);

    let y = doc.y;
    doc.rect(50, y, 512, 18).fill('#FEE2E2');
    doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(8);
    doc.text('STUDENT ID · NAME', 55, y + 5, { width: 180 });
    doc.text('CLASS', 245, y + 5, { width: 60 });
    doc.text('RATE', 315, y + 5, { width: 60 });
    doc.text('FLAGGED ATTENDANCE ISSUE', 385, y + 5, { width: 170 });
    doc.moveDown(1);

    for (const s of lowAtt) {
      y = doc.y;
      doc.rect(50, y, 512, 22).fill('#FFF5F5');
      doc.fillColor('#334155').font('Helvetica').fontSize(8);
      doc.text(s.id + ' · ' + s.name, 55, y + 6);
      doc.text(s.class, 245, y + 6);
      doc.text(`${s.attendanceRate}%`, 315, y + 6);
      doc.text(s.issue, 385, y + 6, { width: 170 });
      doc.moveDown(1.3);
    }
    
    doc.moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('RECOMMENDATIONS');
    doc.fontSize(9).font('Helvetica').fillColor('#475569');
    doc.text('1. Initiate parent-teacher conferences for any student falling below the 75% boundary.');
    doc.text('2. Deploy automated SMS alerts to parents instantly when students are marked absent.');
    doc.text('3. Motivate and reward classes maintaining the highest weekly attendance rates.');

  } else if (type === 'performance') {
    filename = 'performance_report.pdf';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    addPDFHeader(doc, 'ACADEMIC PERFORMANCE REPORT', 'Complete analysis of gradebook scores & top performers');
    const allScores = db.prepare('SELECT score FROM results').all() as { score: number }[];
    const overallAvg = allScores.length > 0 ? roundToTwoSigFigs(allScores.reduce((acc, r) => acc + r.score, 0) / allScores.length) : 0;

    // Rank students
    const studentScores: { [id: string]: { name: string, cls: string, total: number, count: number } } = {};
    const allResults = db.prepare(`
      SELECT r.score, r.student_id, s.first_name, s.last_name, s.class
      FROM results r
      JOIN students s ON r.student_id = s.student_id
    `).all() as any[];

    for (const r of allResults) {
      if (!studentScores[r.student_id]) {
        studentScores[r.student_id] = { name: `${r.first_name} ${r.last_name}`, cls: r.class, total: 0, count: 0 };
      }
      studentScores[r.student_id].total += r.score;
      studentScores[r.student_id].count++;
    }

    const ranked = Object.keys(studentScores).map(id => ({
      id,
      name: studentScores[id].name,
      cls: studentScores[id].cls,
      avg: roundToTwoSigFigs(studentScores[id].total / studentScores[id].count)
    })).sort((a, b) => b.avg - a.avg);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('SUMMARY STATS');
    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`School Overall Average Score: ${overallAvg}%`);
    doc.text(`Total Graded Assessment Rows: ${allScores.length}`);
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').text('TOP ACADEMIC ACHIEVERS');
    doc.moveDown(0.5);

    let y = doc.y;
    doc.rect(50, y, 512, 18).fill('#ECFDF5');
    doc.fillColor('#065F46').font('Helvetica-Bold').fontSize(8);
    doc.text('RANK', 55, y + 5);
    doc.text('STUDENT ID · NAME', 105, y + 5);
    doc.text('CLASS', 305, y + 5);
    doc.text('AVERAGE GRADE', 415, y + 5);
    doc.moveDown(1);

    const top3 = ranked.slice(0, 3);
    let rank = 1;
    for (const s of top3) {
      y = doc.y;
      doc.rect(50, y, 512, 20).fill('#FFFFFF');
      doc.fillColor('#334155').font('Helvetica').fontSize(8);
      doc.text(`#${rank}`, 55, y + 6);
      doc.text(s.id + ' · ' + s.name, 105, y + 6);
      doc.text(s.cls, 305, y + 6);
      doc.text(`${s.avg}%`, 415, y + 6);
      doc.moveDown(1.2);
      rank++;
    }

    doc.moveDown(1.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0F172A').text('ACADEMIC REVIEW CANDIDATES (AVG < 60%)');
    doc.moveDown(0.5);

    y = doc.y;
    doc.rect(50, y, 512, 18).fill('#FFFBEB');
    doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(8);
    doc.text('STUDENT ID · NAME', 55, y + 5);
    doc.text('CLASS', 285, y + 5);
    doc.text('AVERAGE GRADE', 415, y + 5);
    doc.moveDown(1);

    const struggling = ranked.filter(s => s.avg < 60);
    if (struggling.length > 0) {
      for (const s of struggling) {
        y = doc.y;
        doc.rect(50, y, 512, 20).fill('#FFFFFF');
        doc.fillColor('#334155').font('Helvetica').fontSize(8);
        doc.text(s.id + ' · ' + s.name, 55, y + 6);
        doc.text(s.cls, 285, y + 6);
        doc.text(`${s.avg}%`, 415, y + 6);
        doc.moveDown(1.2);
      }
    } else {
      doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748B').text('All active students are performing above the 60% mark.');
      doc.moveDown(1);
    }
  }

  addPDFFooter(doc);
  doc.end();
}

// DOCX EXPORTER
export async function generateDocx(type: string, className: string | undefined, res: any) {
  let doc: Document;
  let filename = `${type}_export.docx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

  const createCell = (text: string, bold = false, align: any = AlignmentType.LEFT, bgColor?: string) => {
    return new TableCell({
      shading: bgColor ? { fill: bgColor } : undefined,
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({ text, bold, size: 18 })
          ]
        })
      ]
    });
  };

  if (type === 'timetable') {
    filename = `timetable_${className || 'class'}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const timetable = fetchTimetable(className || 'JSS1');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const rows = [
      new TableRow({
        children: [
          createCell('Period / Time', true, AlignmentType.LEFT, '3B82F6'),
          ...days.map(d => createCell(d, true, AlignmentType.CENTER, '3B82F6'))
        ]
      })
    ];

    let timeIndex = 0;
    for (const t of timetable.times) {
      const isBreak = t.includes('BREAK');
      if (isBreak) {
        rows.push(new TableRow({
          children: [
            createCell(t, true, AlignmentType.CENTER, 'F1F5F9'),
            createCell('', false, AlignmentType.CENTER, 'F1F5F9'),
            createCell('', false, AlignmentType.CENTER, 'F1F5F9'),
            createCell('', false, AlignmentType.CENTER, 'F1F5F9'),
            createCell('', false, AlignmentType.CENTER, 'F1F5F9'),
            createCell('', false, AlignmentType.CENTER, 'F1F5F9')
          ]
        }));
        continue;
      }

      const rowCells = [createCell(t, false, AlignmentType.LEFT)];
      for (const d of days) {
        const slot = timetable.grid[d][timeIndex];
        if (slot) {
          rowCells.push(createCell(`${slot.subject}\n(${slot.teacher_name})`, false, AlignmentType.CENTER));
        } else {
          rowCells.push(createCell('-', false, AlignmentType.CENTER));
        }
      }
      rows.push(new TableRow({ children: rowCells }));
      timeIndex++;
    }

    doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: `CLASS TIMETABLE: ${className || 'ALL'}`, bold: true, size: 28, color: '1E3A8A' })
            ]
          }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          })
        ]
      }]
    });

  } else if (type === 'student') {
    filename = 'student_report.docx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const students = getStudents();
    const classes = ['JSS1', 'JSS2', 'JSS3', 'SSS1', 'SSS2', 'SSS3'];
    const sectionChildren: any[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: 'STUDENT ACADEMIC AND DISCIPLINARY SUMMARY', bold: true, size: 28, color: '1E3A8A' })
        ]
      }),
      new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
      new Paragraph({ text: '' })
    ];

    for (const cls of classes) {
      const clsStudents = students.filter(s => s.class === cls);
      if (clsStudents.length === 0) continue;

      sectionChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({ text: `CLASS: ${cls}`, bold: true, size: 22, color: '1E40AF' })
        ]
      }));

      const rows = [
        new TableRow({
          children: [
            createCell('Student ID', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Full Name', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Attendance', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Grades / Marks Summary', true, AlignmentType.LEFT, 'E2E8F0')
          ]
        })
      ];

      for (const s of clsStudents) {
        const results = getResultsByStudent(s.student_id);
        let resultsStr = 'No assessment metrics available';
        if (results.length > 0) {
          const avg = roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length);
          resultsStr = `Avg: ${avg}% | ` + results.map(r => `${r.subject} (${r.grade})`).join(', ');
        }

        rows.push(new TableRow({
          children: [
            createCell(s.student_id),
            createCell(s.full_name),
            createCell(`${s.attendance_rate}%`),
            createCell(resultsStr)
          ]
        }));
      }

      sectionChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows
      }));
      sectionChildren.push(new Paragraph({ text: '' }));
    }

    doc = new Document({ sections: [{ children: sectionChildren }] });

  } else if (type === 'class') {
    const cls = className || 'JSS1';
    filename = `class_report_${cls}.docx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const students = getStudents().filter(s => s.class === cls);
    const results = getResultsByClass(cls);

    const sectionChildren: any[] = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: `CLASS LEVEL REPORT: ${cls}`, bold: true, size: 28, color: '1E3A8A' })
        ]
      }),
      new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
      new Paragraph({ text: '' })
    ];

    if (students.length === 0) {
      sectionChildren.push(new Paragraph({ text: 'No student records found in this category.' }));
    } else {
      const avgAtt = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
      const avgScore = results.length > 0 ? roundToTwoSigFigs(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

      sectionChildren.push(new Paragraph({ text: `Total Class Enrollment: ${students.length}` }));
      sectionChildren.push(new Paragraph({ text: `Class Average Attendance Rate: ${avgAtt}%` }));
      sectionChildren.push(new Paragraph({ text: `Class Average Assessment Score: ${avgScore}%` }));
      sectionChildren.push(new Paragraph({ text: '' }));

      const rows = [
        new TableRow({
          children: [
            createCell('Student', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Attendance', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Average', true, AlignmentType.LEFT, 'E2E8F0'),
            createCell('Individual Grades', true, AlignmentType.LEFT, 'E2E8F0')
          ]
        })
      ];

      for (const s of students) {
        const sResults = results.filter(r => r.student_id === s.student_id);
        const sAvg = sResults.length > 0 ? roundToTwoSigFigs(sResults.reduce((acc, r) => acc + r.score, 0) / sResults.length) : 0;

        rows.push(new TableRow({
          children: [
            createCell(`${s.student_id} · ${s.full_name}`),
            createCell(`${s.attendance_rate}%`),
            createCell(sResults.length > 0 ? `${sAvg}%` : 'N/A'),
            createCell(sResults.length > 0 ? sResults.map(r => `${r.subject} (${r.grade})`).join(', ') : 'No data')
          ]
        }));
      }

      sectionChildren.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows
      }));
    }

    doc = new Document({ sections: [{ children: sectionChildren }] });

  } else if (type === 'attendance') {
    filename = 'attendance_report.docx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const students = getStudents();
    const overallAvg = roundToTwoSigFigs(students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length);
    const lowAtt = getLowAttendance(75);

    const rows = [
      new TableRow({
        children: [
          createCell('Student', true, AlignmentType.LEFT, 'FCA5A5'),
          createCell('Class', true, AlignmentType.LEFT, 'FCA5A5'),
          createCell('Rate', true, AlignmentType.LEFT, 'FCA5A5'),
          createCell('Flagged Issue', true, AlignmentType.LEFT, 'FCA5A5')
        ]
      })
    ];

    for (const s of lowAtt) {
      rows.push(new TableRow({
        children: [
          createCell(`${s.id} · ${s.name}`),
          createCell(s.class),
          createCell(`${s.attendanceRate}%`),
          createCell(s.issue)
        ]
      }));
    }

    doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: 'ATTENDANCE SUMMARY REPORT', bold: true, size: 28, color: '1E3A8A' })
            ]
          }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `School-wide Attendance Average: ${overallAvg}%` }),
          new Paragraph({ text: `Total Students Marked Under 75% Threshold: ${lowAtt.length}` }),
          new Paragraph({ text: '' }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: 'STUDENTS REQUIRING ATTENTION', bold: true, size: 20, color: 'DC2626' })
            ]
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows
          })
        ]
      }]
    });

  } else {
    // Academic / Performance Summary
    filename = 'performance_report.docx';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const allScores = db.prepare('SELECT score FROM results').all() as { score: number }[];
    const overallAvg = allScores.length > 0 ? roundToTwoSigFigs(allScores.reduce((acc, r) => acc + r.score, 0) / allScores.length) : 0;

    // Rank students
    const studentScores: { [id: string]: { name: string, cls: string, total: number, count: number } } = {};
    const allResults = db.prepare(`
      SELECT r.score, r.student_id, s.first_name, s.last_name, s.class
      FROM results r
      JOIN students s ON r.student_id = s.student_id
    `).all() as any[];

    for (const r of allResults) {
      if (!studentScores[r.student_id]) {
        studentScores[r.student_id] = { name: `${r.first_name} ${r.last_name}`, cls: r.class, total: 0, count: 0 };
      }
      studentScores[r.student_id].total += r.score;
      studentScores[r.student_id].count++;
    }

    const ranked = Object.keys(studentScores).map(id => ({
      id,
      name: studentScores[id].name,
      cls: studentScores[id].cls,
      avg: roundToTwoSigFigs(studentScores[id].total / studentScores[id].count)
    })).sort((a, b) => b.avg - a.avg);

    const topRows = [
      new TableRow({
        children: [
          createCell('Rank', true, AlignmentType.LEFT, 'A7F3D0'),
          createCell('Student', true, AlignmentType.LEFT, 'A7F3D0'),
          createCell('Class', true, AlignmentType.LEFT, 'A7F3D0'),
          createCell('Average', true, AlignmentType.LEFT, 'A7F3D0')
        ]
      })
    ];

    let rRank = 1;
    for (const s of ranked.slice(0, 3)) {
      topRows.push(new TableRow({
        children: [
          createCell(`#${rRank}`),
          createCell(`${s.id} · ${s.name}`),
          createCell(s.cls),
          createCell(`${s.avg}%`)
        ]
      }));
      rRank++;
    }

    doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: 'ACADEMIC PERFORMANCE SUMMARY', bold: true, size: 28, color: '1E3A8A' })
            ]
          }),
          new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}` }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: `Overall Assessment Mean Average: ${overallAvg}%` }),
          new Paragraph({ text: `Total Graded Entries: ${allScores.length}` }),
          new Paragraph({ text: '' }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [
              new TextRun({ text: 'TOP PERFORMING ACADEMIC ACHIEVERS', bold: true, size: 20, color: '059669' })
            ]
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: topRows
          })
        ]
      }]
    });
  }

  const buffer = await Packer.toBuffer(doc);
  res.send(buffer);
}
