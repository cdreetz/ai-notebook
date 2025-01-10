type PyodideInterface = any;

let pyodideInstance: PyodideInterface | null = null;

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export async function executePythonInBrowser(code: string): Promise<{ output?: string; error?: string }> {
  try {
    if (!pyodideInstance) {
      pyodideInstance = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/"
      });
      
      // Load required packages
      await pyodideInstance.loadPackage(['matplotlib', 'numpy', 'networkx']);
      
      // Initialize matplotlib with Agg backend
      await pyodideInstance.runPythonAsync(`
        import matplotlib
        matplotlib.use('Agg')  # Set backend before importing pyplot
        import matplotlib.pyplot as plt
        import io, base64
        import networkx as nx

        def show_plot():
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=100)
            buf.seek(0)
            img_str = base64.b64encode(buf.getvalue()).decode('utf-8')
            plt.close('all')  # Close all figures to prevent memory leaks
            return f"data:image/png;base64,{img_str}"
      `);
    }

    // Modify matplotlib code to capture output
    const modifiedCode = code.replace(
      /plt\.show\(\)/g,
      'print(show_plot())'  // Add print to ensure the output is captured
    );

    const stdout: string[] = [];
    pyodideInstance.setStdout({ batched: (output: string) => stdout.push(output) });

    await pyodideInstance.runPythonAsync(modifiedCode);
    
    let output = stdout.join('\n');
    
    return { output };
  } catch (error) {
    console.error('Execution error:', error);
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return { error: `Error: ${errorMessage}` };
  }
} 