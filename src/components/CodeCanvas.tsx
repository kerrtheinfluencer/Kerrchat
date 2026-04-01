import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  X,
  Code,
  Eye,
  LayoutTemplate,
  Download,
  Copy,
  Check,
  FilePlus,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCanvasStore } from '@/store';
import { toast } from 'sonner';
import { useMobile } from '@/hooks/useMobile';

interface CodeCanvasProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function CodeCanvas({ onClose, isMobile: propIsMobile }: CodeCanvasProps) {
  const hookMobile = useMobile();
  const isMobile = propIsMobile ?? hookMobile.isMobile;
  
  const {
    files,
    activeFileId,
    previewMode,
    setActiveFile,
    updateFile,
    deleteFile,
    createFile,
    setPreviewMode,
    getActiveFile,
  } = useCanvasStore();

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const activeFile = getActiveFile();

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (activeFileId && value !== undefined) {
        updateFile(activeFileId, { content: value });
      }
    },
    [activeFileId, updateFile]
  );

  const handleCopyCode = async () => {
    if (activeFile?.content) {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Code copied to clipboard');
    }
  };

  const handleDownload = () => {
    if (activeFile) {
      const blob = new Blob([activeFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${activeFile.name}`);
    }
  };

  const handleRunPreview = () => {
    setPreviewKey((k) => k + 1);
    toast.success('Preview refreshed');
  };

  const getLanguageFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      html: 'html',
      htm: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      json: 'json',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      swift: 'swift',
      kt: 'kotlin',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
      md: 'markdown',
    };
    return languageMap[ext || ''] || 'text';
  };

  const generatePreview = () => {
    if (!activeFile) return '';

    const content = activeFile.content;
    const language = activeFile.language;

    // HTML preview
    if (language === 'html' || language === 'htm') {
      return content;
    }

    // React/JSX preview
    if (language === 'jsx' || language === 'tsx' || activeFile.name.endsWith('.jsx') || activeFile.name.endsWith('.tsx')) {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${content}
    
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const App = typeof App !== 'undefined' ? App : () => <div className="p-4">Component preview</div>;
    root.render(<App />);
  </script>
</body>
</html>`;
    }

    // CSS preview
    if (language === 'css' || language === 'scss' || language === 'sass') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${content}</style>
</head>
<body>
  <div class="preview-container">
    <h1>CSS Preview</h1>
    <p>Your CSS styles are applied to this page.</p>
    <div class="sample-elements">
      <button>Button</button>
      <input type="text" placeholder="Input field" />
      <div class="card">Sample card element</div>
    </div>
  </div>
</body>
</html>`;
    }

    // JavaScript preview
    if (language === 'javascript' || language === 'typescript' || language === 'js' || language === 'ts') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JavaScript Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-white p-4">
  <h1 class="text-lg font-bold mb-4">JavaScript Output</h1>
  <div id="output" class="font-mono text-sm bg-slate-800 p-4 rounded"></div>
  <script>
    const originalLog = console.log;
    const output = document.getElementById('output');
    console.log = (...args) => {
      originalLog(...args);
      output.innerHTML += args.map(a => 
        typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
      ).join(' ') + '<br>';
    };
    
    try {
      ${content}
    } catch (e) {
      output.innerHTML += '<span style="color: #ef4444;">Error: ' + e.message + '</span>';
    }
  </script>
</body>
</html>`;
    }

    // Python preview
    if (language === 'python' || language === 'py') {
      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/python.min.js"></script>
</head>
<body class="bg-slate-900 text-white p-4">
  <h1 class="text-lg font-bold mb-4">Python Code Preview</h1>
  <p class="text-slate-400 mb-4 text-sm">Run this code in a Python environment to see output.</p>
  <pre><code class="language-python">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
  <script>hljs.highlightAll();</script>
</body>
</html>`;
    }

    // Default
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
</head>
<body class="bg-slate-900 text-white p-4">
  <h1 class="text-lg font-bold mb-4">Code Preview</h1>
  <pre><code class="language-${language}">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
  <script>hljs.highlightAll();</script>
</body>
</html>`;
  };

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <Code className="w-10 h-10 md:w-12 md:h-12 mb-3 opacity-50" />
        <p className="text-sm md:text-base text-center">No code files yet</p>
        <p className="text-xs md:text-sm text-center mt-1">Ask the AI to write code</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-slate-950 h-full ${
        isFullscreen && !isMobile
          ? 'fixed inset-0 z-50'
          : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -ml-1">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          <FilePlus className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium">Canvas</span>
          <span className="text-xs text-slate-500 hidden sm:inline">({files.length} files)</span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* View Mode Toggle */}
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
            <TabsList className="h-7 md:h-8">
              <TabsTrigger value="code" className="px-2 py-1 text-[10px] md:text-xs">
                <Code className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Code</span>
              </TabsTrigger>
              <TabsTrigger value="split" className="px-2 py-1 text-[10px] md:text-xs">
                <LayoutTemplate className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Split</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="px-2 py-1 text-[10px] md:text-xs">
                <Eye className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Preview</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 md:h-8 px-2"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* File Tabs */}
      {files.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs rounded-md transition-colors whitespace-nowrap ${
                file.id === activeFileId
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileIcon language={file.language} />
              <span className="truncate max-w-[80px] md:max-w-[120px]">{file.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(file.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400"
              >
                <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </button>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 md:h-7 px-1.5 md:px-2 ml-1"
            onClick={() => createFile('untitled.txt', 'text')}
          >
            <FilePlus className="w-3 h-3 md:w-4 md:h-4" />
          </Button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor */}
        {(previewMode === 'code' || previewMode === 'split') && (
          <div
            className={`${
              previewMode === 'split' ? 'w-1/2' : 'w-full'
            } h-full`}
          >
            {activeFile ? (
              <Editor
                height="100%"
                language={getLanguageFromFilename(activeFile.name)}
                value={activeFile.content}
                onChange={handleEditorChange}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: isMobile ? 12 : 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  tabSize: 2,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No file selected
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div
            className={`${
              previewMode === 'split' ? 'w-1/2 border-l border-slate-800' : 'w-full'
            } h-full bg-white`}
          >
            <div className="flex items-center justify-between px-2 md:px-3 py-1 bg-slate-100 border-b border-slate-200">
              <span className="text-[10px] md:text-xs text-slate-600">Preview</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-5 md:h-6 px-1.5" onClick={handleRunPreview}>
                  <RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </Button>
              </div>
            </div>
            <iframe
              key={previewKey}
              srcDoc={generatePreview()}
              className="w-full h-[calc(100%-24px)] md:h-[calc(100%-28px)] border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Code Preview"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 md:px-4 py-1.5 md:py-2 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-slate-500">
          {activeFile && (
            <>
              <span className="hidden sm:inline">{activeFile.language}</span>
              <span>{activeFile.content.length} chars</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="sm" className="h-6 md:h-7 px-1.5 md:px-2 text-[10px] md:text-xs" onClick={handleCopyCode}>
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-6 md:h-7 px-1.5 md:px-2 text-[10px] md:text-xs" onClick={handleDownload}>
            <Download className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function FileIcon({ language }: { language: string }) {
  const color =
    {
      javascript: 'text-yellow-400',
      typescript: 'text-blue-400',
      python: 'text-green-400',
      html: 'text-orange-400',
      css: 'text-blue-300',
      json: 'text-gray-400',
    }[language.toLowerCase()] || 'text-slate-400';

  return <Code className={`w-2.5 h-2.5 md:w-3 md:h-3 ${color}`} />;
}
