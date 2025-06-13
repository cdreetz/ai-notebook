import { App } from "modal";
import { NextResponse } from "next/server";

interface SandboxConfig {
  app_name: string;
  image: string;
}

export async function POST(req: Request) {
    const config: SandboxConfig = await req.json();
    const app = await App.lookup(config.app_name, { createIfMissing: true });
    const image = await app.imageFromRegistry("python:3.11-slim");
    const sandbox = await app.createSandbox(image);

    return NextResponse.json({
        sandboxId: sandbox.sandboxId
    });
}
