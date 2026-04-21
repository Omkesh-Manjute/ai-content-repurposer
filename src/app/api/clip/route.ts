import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { url, start, end, filename } = await req.json();

    if (!url || start === undefined || end === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters: url, start, end" },
        { status: 400 }
      );
    }

    const scriptPath = path.join(process.cwd(), "clipper.py");
    const clipConfig = JSON.stringify({ url, start, end, filename });

    return new Promise<NextResponse>((resolve) => {
      // Spawn python process
      // We use 'python' because we verified it's available as Python 3.14.2
      const pythonProcess = spawn("python", [scriptPath, clipConfig]);

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        console.log(`Clipper process exited with code ${code}`);
        if (code !== 0) {
          console.error("Clipper Error:", stderr);
          
          let parsedErrorMsg = "Failed to process video clip";
          try {
            // Check if stderr contains our JSON formatted error string
            const errorLines = stderr.trim().split('\n');
            const jsonError = JSON.parse(errorLines[errorLines.length - 1]);
            if (jsonError.message) parsedErrorMsg = jsonError.message;
          } catch(e) {}

          return resolve(
            NextResponse.json(
              { error: parsedErrorMsg, details: stderr },
              { status: 500 }
            )
          );
        }

        try {
          const result = JSON.parse(stdout.trim().split("\n").pop() || "{}");
          if (result.status === "success") {
            resolve(NextResponse.json(result));
          } else {
            resolve(
              NextResponse.json(
                { error: result.message || "Failed to create clip" },
                { status: 500 }
              )
            );
          }
        } catch (e) {
          console.error("Failed to parse clipper output:", stdout);
          resolve(
            NextResponse.json(
              { error: "Invalid response from clipping engine", details: stdout },
              { status: 500 }
            )
          );
        }
      });
    });
  } catch (err: unknown) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
