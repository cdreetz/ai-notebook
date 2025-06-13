import { App, Sandbox } from "modal";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    console.log("[DEBUG] Execute endpoint called");
    const { sandbox_id, command } = await req.json();
    console.log("[DEBUG] Request data:", { sandbox_id, command });

    try {
        console.log("[DEBUG] Creating Sandbox instance");
        const sandbox = new Sandbox(sandbox_id);
        console.log("[DEBUG] Sandbox instance created");
        
        console.log("[DEBUG] Executing command:", command);
        const process = await sandbox.exec(["/bin/sh", "-c", command], {
            mode: "text",
            stdout: "pipe",
            stderr: "pipe"
        });
        console.log("[DEBUG] Command execution started");

        // Wait for the process to complete and get the output
        console.log("[DEBUG] Waiting for process output");
        const [stdout, stderr] = await Promise.all([
            process.stdout.readText(),
            process.stderr.readText()
        ]);
        console.log("[DEBUG] Process output received:", { 
            stdout: stdout?.substring(0, 100) + (stdout?.length > 100 ? '...' : ''),
            stderr: stderr?.substring(0, 100) + (stderr?.length > 100 ? '...' : '')
        });

        const exitCode = await process.wait();
        console.log("[DEBUG] Process completed with exit code:", exitCode);

        return NextResponse.json({
            stdout,
            stderr,
            exitCode
        });
    } catch (error) {
        console.error("[DEBUG] Error executing command in sandbox:", error);
        return NextResponse.json(
            { error: "Failed to execute command in sandbox" },
            { status: 500 }
        );
    }
}