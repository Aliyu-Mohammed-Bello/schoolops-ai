import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import * as tools from './backendTools';

// In-memory activity feed for the last 20 tool calls
export interface ToolActivityLog {
  timestamp: string;
  toolName: string;
  args: any;
  resultSummary: string;
}

export const activityFeed: ToolActivityLog[] = [];

export function logActivity(toolName: string, args: any, resultSummary: string) {
  const logEntry: ToolActivityLog = {
    timestamp: new Date().toLocaleTimeString(),
    toolName,
    args,
    resultSummary
  };
  activityFeed.unshift(logEntry);
  if (activityFeed.length > 20) {
    activityFeed.pop();
  }
}

// Lazy initializer for GoogleGenAI to prevent crashing on missing key
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Function schemas
const getStudentsDecl: FunctionDeclaration = {
  name: 'getStudents',
  description: 'Retrieve all students in the school, showing student IDs, full names, classes, genders, and parent details.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const getStudentByIdDecl: FunctionDeclaration = {
  name: 'getStudentById',
  description: 'Retrieve a single student record using their stable, human-readable student_id (e.g., STU001).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: { type: Type.STRING, description: 'The student_id to look up, e.g., STU001.' }
    },
    required: ['studentId']
  }
};

const addStudentDecl: FunctionDeclaration = {
  name: 'addStudent',
  description: 'Add a new student to the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      first_name: { type: Type.STRING },
      last_name: { type: Type.STRING },
      class: { type: Type.STRING, description: 'Must be one of JSS1, JSS2, JSS3, SSS1, SSS2, SSS3' },
      gender: { type: Type.STRING },
      parent_name: { type: Type.STRING },
      parent_phone: { type: Type.STRING }
    },
    required: ['first_name', 'last_name', 'class', 'gender', 'parent_name', 'parent_phone']
  }
};

const getTeachersDecl: FunctionDeclaration = {
  name: 'getTeachers',
  description: 'Retrieve the roster of all teachers, their subjects, and workloads.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const getTeacherBySubjectDecl: FunctionDeclaration = {
  name: 'getTeacherBySubject',
  description: 'Retrieve teachers who specialize in and teach a specific subject.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING, description: 'The subject field, e.g., Mathematics, English, Physics, Chemistry.' }
    },
    required: ['subject']
  }
};

const addTeacherDecl: FunctionDeclaration = {
  name: 'addTeacher',
  description: 'Add a new teacher to the database.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      first_name: { type: Type.STRING },
      last_name: { type: Type.STRING },
      subject: { type: Type.STRING },
      workload: { type: Type.INTEGER }
    },
    required: ['first_name', 'last_name', 'subject', 'workload']
  }
};

const getAttendanceByClassDecl: FunctionDeclaration = {
  name: 'getAttendanceByClass',
  description: 'Retrieve class attendance records for a specific class (JSS1 to SSS3).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: { type: Type.STRING, description: 'Must be one of JSS1, JSS2, JSS3, SSS1, SSS2, SSS3' }
    },
    required: ['className']
  }
};

const getAttendanceByStudentDecl: FunctionDeclaration = {
  name: 'getAttendanceByStudent',
  description: 'Retrieve detailed attendance history for an individual student by student_id.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: { type: Type.STRING }
    },
    required: ['studentId']
  }
};

const getLowAttendanceDecl: FunctionDeclaration = {
  name: 'getLowAttendance',
  description: 'Retrieve students whose attendance rate is below a given percentage threshold.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      threshold: { type: Type.INTEGER, description: 'Threshold percentage. Defaults to 75% if not provided.' }
    }
  }
};

const getResultsByStudentDecl: FunctionDeclaration = {
  name: 'getResultsByStudent',
  description: 'Retrieve the academic results (subjects, scores, grades, term, session) for a single student.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      studentId: { type: Type.STRING }
    },
    required: ['studentId']
  }
};

const getResultsByClassDecl: FunctionDeclaration = {
  name: 'getResultsByClass',
  description: 'Retrieve academic results of all students in a given class.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: { type: Type.STRING, description: 'Must be JSS1, JSS2, JSS3, SSS1, SSS2, or SSS3' }
    },
    required: ['className']
  }
};

const generateStudentReportDecl: FunctionDeclaration = {
  name: 'generateStudentReport',
  description: 'Generate a school-wide structured text report of all students, grouped by class with their grades & attendance summaries.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const generateClassReportDecl: FunctionDeclaration = {
  name: 'generateClassReport',
  description: 'Generate a structured text report for a single class (e.g., JSS3).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: { type: Type.STRING, description: 'Must be JSS1, JSS2, JSS3, SSS1, SSS2, or SSS3' }
    },
    required: ['className']
  }
};

const generateAttendanceReportDecl: FunctionDeclaration = {
  name: 'generateAttendanceReport',
  description: 'Generate an overall text attendance analysis report highlighting critical attention students.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const generatePerformanceSummaryDecl: FunctionDeclaration = {
  name: 'generatePerformanceSummary',
  description: 'Generate an academic performance report summarizing achievers and students needing support.',
  parameters: { type: Type.OBJECT, properties: {} }
};

const generateTimetableDecl: FunctionDeclaration = {
  name: 'generateTimetable',
  description: 'Generate a clash-free weekly timetable grid for a specific class.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      className: { type: Type.STRING, description: 'Must be JSS1, JSS2, JSS3, SSS1, SSS2, or SSS3' }
    },
    required: ['className']
  }
};

const allDeclarations = [
  getStudentsDecl, getStudentByIdDecl, addStudentDecl,
  getTeachersDecl, getTeacherBySubjectDecl, addTeacherDecl,
  getAttendanceByClassDecl, getAttendanceByStudentDecl, getLowAttendanceDecl,
  getResultsByStudentDecl, getResultsByClassDecl,
  generateStudentReportDecl, generateClassReportDecl, generateAttendanceReportDecl, generatePerformanceSummaryDecl,
  generateTimetableDecl
];

const systemInstruction = `You are SchoolOps AI, a virtual school administrator assistant. You help staff analyze students, teachers, attendance, and reports by understanding natural language requests and calling the correct tool. Rules:
- Always call a tool to get real data before answering — never invent names, numbers, or stats.
- Never use markdown formatting in responses — no asterisks, no bullet symbols, no bold markers. Write in plain, professional prose with clear line breaks, as if writing a real business report.
- Summarize data in plain, concise language a busy administrator can read quickly.
- If a request is ambiguous (e.g. no threshold given for low attendance), use a sensible default (75%) and state what default you used.
- If no tool fits the request, say so honestly instead of guessing.`;

export async function askAgent(message: string): Promise<string> {
  const ai = getAIClient();

  // Call Gemini with tools defined
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: message,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: allDeclarations }],
    }
  });

  const functionCalls = response.functionCalls;
  if (!functionCalls || functionCalls.length === 0) {
    // No tool called, clean markdown if any
    return cleanMarkdown(response.text || "I am here to assist with school operations. Please ask me to analyze student records, attendance, timetables, or reports.");
  }

  // Execute the requested tools
  const functionParts: any[] = [];
  const functionResponses: any[] = [];

  for (const call of functionCalls) {
    const { name, args, id } = call;
    let result: any = null;

    try {
      if (name === 'getStudents') {
        result = tools.getStudents();
        logActivity(name, args, `Fetched ${result.length} student records.`);
      } else if (name === 'getStudentById') {
        result = tools.getStudentById(args.studentId as string);
        logActivity(name, args, result ? `Found student ${result.full_name}` : 'Student not found');
      } else if (name === 'addStudent') {
        result = tools.addStudent(args as any);
        logActivity(name, args, `Added student: ${result.full_name}`);
      } else if (name === 'getTeachers') {
        result = tools.getTeachers();
        logActivity(name, args, `Fetched ${result.length} teacher records.`);
      } else if (name === 'getTeacherBySubject') {
        result = tools.getTeacherBySubject(args.subject as string);
        logActivity(name, args, `Fetched ${result.length} teachers for ${args.subject}.`);
      } else if (name === 'addTeacher') {
        result = tools.addTeacher(args as any);
        logActivity(name, args, `Added teacher: ${result.full_name}`);
      } else if (name === 'getAttendanceByClass') {
        result = tools.getAttendanceByClass(args.className as string);
        logActivity(name, args, `Fetched attendance for ${args.className}.`);
      } else if (name === 'getAttendanceByStudent') {
        result = tools.getAttendanceByStudent(args.studentId as string);
        logActivity(name, args, `Fetched attendance for ${args.studentId}.`);
      } else if (name === 'getLowAttendance') {
        const threshold = args.threshold !== undefined ? Number(args.threshold) : 75;
        result = tools.getLowAttendance(threshold);
        logActivity(name, args, `Found ${result.length} students under ${threshold}% attendance.`);
      } else if (name === 'getResultsByStudent') {
        result = tools.getResultsByStudent(args.studentId as string);
        logActivity(name, args, `Fetched ${result.length} results for ${args.studentId}.`);
      } else if (name === 'getResultsByClass') {
        result = tools.getResultsByClass(args.className as string);
        logActivity(name, args, `Fetched results for ${args.className}.`);
      } else if (name === 'generateStudentReport') {
        result = tools.generateStudentReport();
        logActivity(name, args, `Generated general student text report.`);
      } else if (name === 'generateClassReport') {
        result = tools.generateClassReport(args.className as string);
        logActivity(name, args, `Generated class report for ${args.className}.`);
      } else if (name === 'generateAttendanceReport') {
        result = tools.generateAttendanceReport();
        logActivity(name, args, `Generated attendance summary text report.`);
      } else if (name === 'generatePerformanceSummary') {
        result = tools.generatePerformanceSummary();
        logActivity(name, args, `Generated performance text summary.`);
      } else if (name === 'generateTimetable') {
        result = tools.generateTimetable(args.className as string);
        logActivity(name, args, `Generated weekly timetable for ${args.className}.`);
      } else {
        result = { error: "Unknown tool function called." };
      }
    } catch (err: any) {
      result = { error: err.message || "Execution error" };
      logActivity(name, args, `Error: ${err.message}`);
    }

    // Capture standard Gemini tool response structure
    functionResponses.push({
      response: { name, response: { result } }
    });
  }

  // To preserve context, send the conversation history containing:
  // 1. User message
  // 2. The functionCalls response
  // 3. The functionResponse response
  const previousContent = response.candidates?.[0]?.content;
  
  const finalResponse = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      { role: 'user', parts: [{ text: message }] },
      previousContent!,
      {
        role: 'user',
        parts: functionResponses.map(fr => ({
          functionResponse: {
            name: fr.response.name,
            response: fr.response.response
          }
        }))
      }
    ],
    config: {
      systemInstruction
    }
  });

  return cleanMarkdown(finalResponse.text || "Error processing tool response.");
}

// Function to strictly clean any markdown characters to fulfill the requirement:
// "Never use markdown formatting in responses — no asterisks, no bullet symbols, no bold markers. Write in plain, professional prose with clear line breaks"
function cleanMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, '') // remove bold markers
    .replace(/\*/g, '')   // remove single asterisks
    .replace(/### /g, '') // remove headings
    .replace(/## /g, '')
    .replace(/# /g, '')
    .replace(/_([^_]+)_/g, '$1') // remove italic underscores
    .replace(/`([^`]+)`/g, '$1')  // remove code ticks
    .trim();
}
