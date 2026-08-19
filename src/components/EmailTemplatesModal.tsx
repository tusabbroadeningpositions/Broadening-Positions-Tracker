import React, { useState, useEffect } from "react";
import { X, Mail, Save, RotateCcw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { EmailTemplate, getEmailTemplatesFromFirestore, saveEmailTemplateToFirestore, DEFAULT_TEMPLATES } from "../data/emailTemplates";

interface EmailTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EmailTemplatesModal({ isOpen, onClose }: EmailTemplatesModalProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("roster_update_approved");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states for the selected template
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getEmailTemplatesFromFirestore();
      setTemplates(fetched);
      const initial = fetched.find(t => t.id === selectedId) || fetched[0];
      if (initial) {
        setSelectedId(initial.id);
        setSubject(initial.subject);
        setBody(initial.body);
      }
    } catch (err: any) {
      setError("Failed to load email templates from database.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = templates.find(t => t.id === selectedId);

  useEffect(() => {
    if (currentTemplate) {
      setSubject(currentTemplate.subject);
      setBody(currentTemplate.body);
      setSuccess(null);
      setError(null);
    }
  }, [selectedId, templates]);

  const handleSave = async () => {
    if (!currentTemplate) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated: EmailTemplate = {
        ...currentTemplate,
        subject,
        body
      };
      await saveEmailTemplateToFirestore(updated);
      
      // Update local state
      setTemplates(prev => prev.map(t => t.id === selectedId ? updated : t));
      setSuccess(`Successfully saved template: ${currentTemplate.name}`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError("Failed to save template to the database.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    if (!currentTemplate) return;
    const def = DEFAULT_TEMPLATES.find(t => t.id === selectedId);
    if (def) {
      setSubject(def.subject);
      setBody(def.body);
      setSuccess("Reset to system default values. (Click Save to persist)");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-indigo-500 fill-indigo-500/10" />
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">Manage Default Email Templates</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-normal">Edit automated draft emails triggered during admin actions.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-slate-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Split Screen */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Sidebar: Template Selector */}
          <div className="w-full md:w-80 bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-800 p-4 shrink-0 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Email Workflows</h4>
            <div className="space-y-1">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading templates...</div>
              ) : (
                templates.map((temp) => (
                  <button
                    key={temp.id}
                    onClick={() => setSelectedId(temp.id)}
                    className={`w-full text-left p-3 rounded-lg border transition duration-150 flex flex-col ${
                      selectedId === temp.id
                        ? "bg-indigo-600/10 border-indigo-500/50 text-slate-100"
                        : "bg-transparent border-transparent hover:bg-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-xs font-bold">{temp.name}</span>
                    <span className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {temp.description}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900 p-6 overflow-y-auto">
            {currentTemplate ? (
              <div className="flex-1 flex flex-col space-y-4">
                {/* Meta details */}
                <div className="bg-slate-950/30 border border-slate-800/40 rounded-lg p-3 flex gap-2.5">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-300">How to use placeholders:</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                      Placeholders will be automatically replaced with the actual record details when generating a draft. Make sure to preserve curly braces exactly.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentTemplate.variables.map((v) => (
                        <code
                          key={v}
                          onClick={() => {
                            // Basic insert helper
                            setBody(prev => prev + " " + v);
                          }}
                          title="Click to append to email body"
                          className="px-1.5 py-0.5 bg-slate-950 text-[10px] font-mono text-indigo-400 rounded border border-slate-800 hover:bg-indigo-950/20 hover:border-indigo-800/40 cursor-pointer select-none transition"
                        >
                          {v}
                        </code>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subject Input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Subject Line Template
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-750 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200 font-medium"
                    placeholder="Subject line"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Body Textarea */}
                <div className="flex-1 flex flex-col space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Email Body Template
                  </label>
                  <textarea
                    className="flex-1 min-h-[180px] w-full px-3.5 py-3 bg-slate-950 border border-slate-750 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200 font-mono leading-relaxed resize-none"
                    placeholder="Write email body text here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </div>

                {/* Status alerts */}
                {success && (
                  <div className="flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 bg-slate-950/20 hover:bg-slate-850/50 rounded text-xs font-semibold border border-slate-800 transition duration-150"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to System Default</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white rounded text-xs font-semibold shadow-sm transition duration-150"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving Changes..." : "Save Template"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs">
                Select an email template workflow from the list to start editing.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
