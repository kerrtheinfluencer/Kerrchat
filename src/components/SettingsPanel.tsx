import { useState } from 'react';
import {
  X,
  Key,
  Palette,
  Cpu,
  Brain,
  Volume2,
  Languages,
  Save,
  Eye,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSettingsStore, useModelStore } from '@/store';

interface SettingsPanelProps {
  onClose: () => void;
  isMobile?: boolean;
}

export function SettingsPanel({ onClose, isMobile }: SettingsPanelProps) {
  const settings = useSettingsStore();
  const { models, updateModel } = useModelStore();

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openrouter: localStorage.getItem('openrouter_api_key') || '',
    groq: localStorage.getItem('groq_api_key') || '',
  });

  const handleSaveApiKeys = () => {
    Object.entries(apiKeys).forEach(([provider, key]) => {
      localStorage.setItem(`${provider}_api_key`, key);
      settings.setApiKey(provider, key);
    });
    toast.success('API keys saved');
  };

  const handleTestConnection = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key) {
      toast.error(`Please enter a ${provider} API key`);
      return;
    }

    toast.info(`Testing ${provider} connection...`);

    try {
      const baseUrl =
        provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : 'https://api.groq.com/openai/v1';

      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      });

      if (response.ok) {
        toast.success(`${provider} connection successful!`);
      } else {
        toast.error(`${provider} connection failed: ${response.statusText}`);
      }
    } catch (error) {
      toast.error(`${provider} connection failed`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4">
      <div className={`w-full ${isMobile ? 'h-full max-h-full' : 'max-w-2xl max-h-[90vh]'} bg-slate-950 border border-slate-800 rounded-xl shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" />
            </div>
            <h2 className="text-lg md:text-xl font-bold">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
        </div>

        {/* Content */}
        <Tabs defaultValue="api" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-3 md:px-6 py-2 justify-start border-b border-slate-800 rounded-none overflow-x-auto">
            <TabsTrigger value="api" className="gap-1.5 md:gap-2 text-xs md:text-sm">
              <Key className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">API Keys</span>
              <span className="sm:hidden">API</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5 md:gap-2 text-xs md:text-sm">
              <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Models</span>
              <span className="sm:hidden">Models</span>
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-1.5 md:gap-2 text-xs md:text-sm">
              <Brain className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Agents</span>
              <span className="sm:hidden">Agents</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-1.5 md:gap-2 text-xs md:text-sm">
              <Palette className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Preferences</span>
              <span className="sm:hidden">Prefs</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            {/* API Keys Tab */}
            <TabsContent value="api" className="mt-0 space-y-4 md:space-y-6">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs md:text-sm text-amber-200">
                      API keys are stored locally in your browser. Never share your keys.
                    </p>
                  </div>
                </div>

                {/* OpenRouter */}
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Key className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    OpenRouter API Key
                    <Badge variant="secondary" className="text-[9px] md:text-[10px]">Recommended</Badge>
                  </Label>
                  <div className="flex gap-1.5 md:gap-2">
                    <Input
                      type="password"
                      value={apiKeys.openrouter}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, openrouter: e.target.value }))
                      }
                      placeholder="sk-or-v1-..."
                      className="flex-1 text-xs md:text-sm"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleTestConnection('openrouter')}
                      className="text-xs md:text-sm px-2 md:px-3"
                    >
                      Test
                    </Button>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-500">
                    Get your key from{' '}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>

                {/* Groq */}
                <div className="space-y-1.5 md:space-y-2">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Key className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Groq API Key
                  </Label>
                  <div className="flex gap-1.5 md:gap-2">
                    <Input
                      type="password"
                      value={apiKeys.groq}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, groq: e.target.value }))
                      }
                      placeholder="gsk_..."
                      className="flex-1 text-xs md:text-sm"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleTestConnection('groq')}
                      className="text-xs md:text-sm px-2 md:px-3"
                    >
                      Test
                    </Button>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-500">
                    Get your key from{' '}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      console.groq.com
                    </a>
                  </p>
                </div>

                <Button onClick={handleSaveApiKeys} className="w-full gap-1.5 md:gap-2 text-xs md:text-sm">
                  <Save className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Save API Keys
                </Button>
              </div>
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models" className="mt-0 space-y-3 md:space-y-4">
              <div className="space-y-3 md:space-y-4">
                <p className="text-xs md:text-sm text-slate-400">
                  Configure model settings and add custom models.
                </p>

                {models.map((model) => (
                  <div
                    key={model.id}
                    className="p-3 md:p-4 border border-slate-800 rounded-lg space-y-2 md:space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm md:text-base">{model.name}</h4>
                        <p className="text-[10px] md:text-xs text-slate-500">
                          {model.provider} · {(model.contextWindow / 1000).toFixed(0)}k context
                        </p>
                      </div>
                      {model.isFree && (
                        <Badge variant="secondary" className="text-[9px] md:text-[10px]">
                          Free
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <Label className="text-[10px] md:text-xs">Temperature: {model.temperature}</Label>
                        <Slider
                          value={[model.temperature]}
                          min={0}
                          max={2}
                          step={0.1}
                          onValueChange={([v]) => updateModel(model.id, { temperature: v })}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] md:text-xs">Max Tokens: {model.maxTokens}</Label>
                        <Slider
                          value={[model.maxTokens]}
                          min={256}
                          max={8192}
                          step={256}
                          onValueChange={([v]) => updateModel(model.id, { maxTokens: v })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents" className="mt-0 space-y-3 md:space-y-4">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Show Agent Thoughts
                  </Label>
                  <Switch
                    checked={settings.showThoughts}
                    onCheckedChange={(v) => settings.updateSettings({ showThoughts: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Zap className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Auto-compress long chats
                  </Label>
                  <Switch
                    checked={settings.autoCompress}
                    onCheckedChange={(v) => settings.updateSettings({ autoCompress: v })}
                  />
                </div>

                {settings.autoCompress && (
                  <div>
                    <Label className="text-[10px] md:text-xs">
                      Compression Threshold: {settings.compressionThreshold} tokens
                    </Label>
                    <Slider
                      value={[settings.compressionThreshold]}
                      min={1000}
                      max={20000}
                      step={1000}
                      onValueChange={([v]) =>
                        settings.updateSettings({ compressionThreshold: v })
                      }
                    />
                  </div>
                )}

                <div>
                  <Label className="text-[10px] md:text-xs">
                    Max Context Window: {settings.maxContextWindow} tokens
                  </Label>
                  <Slider
                    value={[settings.maxContextWindow]}
                    min={4000}
                    max={128000}
                    step={4000}
                    onValueChange={([v]) =>
                      settings.updateSettings({ maxContextWindow: v })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="mt-0 space-y-3 md:space-y-4">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Palette className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Theme
                  </Label>
                  <select
                    value={settings.theme}
                    onChange={(e) =>
                      settings.updateSettings({ theme: e.target.value as any })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-2 md:px-3 py-1 text-xs md:text-sm"
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Volume2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Voice Input
                  </Label>
                  <Switch
                    checked={settings.enableVoice}
                    onCheckedChange={(v) => settings.updateSettings({ enableVoice: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                    <Languages className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    Language
                  </Label>
                  <select
                    value={settings.language}
                    onChange={(e) =>
                      settings.updateSettings({ language: e.target.value })
                    }
                    className="bg-slate-800 border border-slate-700 rounded px-2 md:px-3 py-1 text-xs md:text-sm"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>

                <div className="pt-3 md:pt-4 border-t border-slate-800">
                  <Button
                    variant="destructive"
                    className="w-full text-xs md:text-sm"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1.5" />
                    Reset All Data
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
