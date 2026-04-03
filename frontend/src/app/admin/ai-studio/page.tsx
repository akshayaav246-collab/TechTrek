"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/context/AuthContext";

type EventType = { eventId: string; _id: string; name: string; status: string; speakers: any[] };

export default function AIStudioPage() {
  const { token } = useAuth();
  const [useAi, setUseAi] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [events, setEvents] = useState<EventType[]>([]);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("http://localhost:5000/api/events");
        if (res.ok) {
           const data = await res.json();
           setEvents(data);
        }
      } catch (e) {
        console.error("Failed to fetch events", e);
      }
    }
    fetchEvents();
  }, []);

  return (
    <AdminLayout title="AI Studio">
      <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 mb-1">Anthropic API Key</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
            </span>
            <input 
              type={showApiKey ? "text" : "password"}
              className="w-full bg-gray-50 pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8631a] focus:ring-1 focus:ring-[#e8631a]"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button 
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowApiKey(!showApiKey)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showApiKey 
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                }
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center shrink-0 mb-2 md:mb-0">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only" checked={useAi} onChange={() => setUseAi(!useAi)} />
              <div className={`block w-10 h-6 rounded-full transition-colors ${useAi ? 'bg-[#e8631a]' : 'bg-gray-300'}`}></div>
              <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${useAi ? 'transform translate-x-4' : ''}`}></div>
            </div>
            <div className="ml-3 font-bold text-sm text-gray-700">Use AI</div>
          </label>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        <div className="w-full xl:w-1/2">
           <SpeakerExtractor useAi={useAi} apiKey={apiKey} events={events} token={token} />
        </div>
        <div className="w-full xl:w-1/2">
           <AgendaBuilder useAi={useAi} apiKey={apiKey} events={events} token={token} />
        </div>
      </div>
    </AdminLayout>
  );
}

// ----- Speaker Extractor Component -----
function SpeakerExtractor({ useAi, apiKey, events, token }: { useAi: boolean, apiKey: string, events: EventType[], token: string | null }) {
  const [inputData, setInputData] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [speakerData, setSpeakerData] = useState<any>(null);
  const [selectedEventId, setSelectedEventId] = useState("");

  const handleExtract = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setSpeakerData(null);
    if (!inputData.trim()) {
      setErrorMsg("Please provide input text");
      return;
    }

    setLoading(true);
    try {
      if (!useAi) {
        // Fallback Logic
        await new Promise(resolve => setTimeout(resolve, 500)); // fake delay
        const parts = inputData.split(',').map(s => s.trim());
        let name = parts[0] || "Unknown";
        if (inputData.includes("linkedin.com/in/")) {
           const slug = inputData.split("linkedin.com/in/")[1].split("/")[0];
           name = slug.split("-").map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(" ");
        }
        const role = parts[1] || "Professional";
        const company = parts[2] || "Unknown Company";
        
        const tags = [];
        const lowerRole = role.toLowerCase();
        if (lowerRole.match(/engineer|tech|developer/)) tags.push("Engineering");
        if (lowerRole.match(/ai|ml|machine learning/)) { tags.push("AI"); tags.push("ML"); }
        if (lowerRole.match(/product|pm|cpo/)) tags.push("Product");
        if (lowerRole.match(/finance|fintech|banking/)) tags.push("FinTech");
        if (lowerRole.match(/ceo|founder|chief/)) tags.push("Leadership");
        if (tags.length === 0) tags.push("General");

        let seniority = "Individual";
        if (lowerRole.match(/ceo|cto|founder|chief|c.o/)) seniority = "C-Suite";
        else if (lowerRole.match(/vp|vice president/)) seniority = "VP";
        else if (lowerRole.match(/director/)) seniority = "Director";
        else if (lowerRole.match(/manager|lead|head/)) seniority = "Manager";

        let keynoteScore = 40, panelScore = 65, workshopScore = 85;
        if (seniority === "C-Suite") { keynoteScore = 90; panelScore = 75; workshopScore = 50; }
        else if (seniority === "VP") { keynoteScore = 75; panelScore = 80; workshopScore = 60; }
        else if (seniority === "Director") { keynoteScore = 65; panelScore = 78; workshopScore = 65; }
        else if (seniority === "Manager") { keynoteScore = 50; panelScore = 70; workshopScore = 75; }
        
        if (tags.includes("Engineering") || tags.includes("AI") || tags.includes("ML")) {
            workshopScore = Math.min(100, workshopScore + 15);
        }

        setSpeakerData({
           name, role, company, bio: `Experienced ${role} currently at ${company}. Proven track record in the industry.`,
           tags, seniority, keynoteScore, panelScore, workshopScore
        });
      } else {
        // AI Logic
        if (!apiKey) {
            setErrorMsg("Anthropic API key is required");
            setLoading(false);
            return;
        }

        const prompt = `The user provided: "${inputData}"\nThis may be a LinkedIn URL or plain text "Name, Role, Company".\n\nReturn ONLY valid JSON, no markdown, no backticks:\n{\n  "name": "full name",\n  "role": "job title",\n  "company": "company name",\n  "bio": "2 sentence professional bio",\n  "tags": ["3-5 from: AI, ML, Data, Engineering, FinTech, EV, HealthTech, Product, Design, SaaS, Startups, Marketing, EdTech, Leadership, Policy"],\n  "seniority": "C-Suite|VP|Director|Manager|Individual",\n  "keynoteScore": 85,\n  "panelScore": 70,\n  "workshopScore": 60\n}\n\nScoring:\n- keynoteScore: 80-95 for C-Suite, 55-75 for VP/Director, 30-50 for others\n- panelScore: 60-85 across all levels\n- workshopScore: 75-90 for Engineering/ML/Data roles, 50-70 for business roles\n- For LinkedIn URLs parse the slug to infer name\n- Never return null fields`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
          })
        });

        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error?.message || "Anthropic API error");
        }

        const data = await res.json();
        const textContent = data.content[0].text.trim();
        const obj = JSON.parse(textContent);
        setSpeakerData(obj);
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to extract speaker");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedEventId) {
      setErrorMsg("Please select an event");
      return;
    }
    if (!speakerData) return;

    try {
      const res = await fetch(`http://localhost:5000/api/events/${selectedEventId}/speakers`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(speakerData)
      });
      if (res.ok) {
        setSuccessMsg("Speaker saved!");
        setSpeakerData(null);
        setInputData("");
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to save speaker");
      }
    } catch (error: any) {
        setErrorMsg("Network error: " + error.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800">Speaker Extractor</h2>
        <span className="bg-[#e8631a]/10 text-[#e8631a] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">AI powered</span>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <input 
            className="w-full bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8631a] focus:ring-1 focus:ring-[#e8631a]"
            value={inputData}
            onChange={e => setInputData(e.target.value)}
            placeholder="LinkedIn URL or Name, Role, Company"
          />
          {errorMsg && <p className="text-red-500 text-xs mt-1 font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-green-600 text-xs mt-1 font-medium">{successMsg}</p>}
        </div>

        <button 
          onClick={handleExtract}
          disabled={loading}
          className="bg-[#e8631a] hover:bg-[#d55815] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex justify-center items-center gap-2"
        >
          {loading ? (
             <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Analysing profile...</>
          ) : "Extract Profile"}
        </button>

        {speakerData && !loading && (
          <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 shrink-0">
                   {speakerData.name?.split(' ').map((n:any)=>n[0]).join('').substring(0,2).toUpperCase()}
                </div>
                <div>
                   <h3 className="font-bold text-gray-900">{speakerData.name}</h3>
                   <p className="text-sm text-gray-600">{speakerData.role}, {speakerData.company}</p>
                </div>
             </div>
             
             <p className="text-xs text-gray-600 leading-relaxed">{speakerData.bio}</p>

             <div className="flex flex-wrap gap-1.5">
                <span className="bg-gray-200 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">{speakerData.seniority}</span>
                {speakerData.tags?.map((tag: string) => {
                    let colorClass = "bg-gray-100 text-gray-600";
                    if (tag.match(/AI|ML|Data/i)) colorClass = "bg-blue-50 text-blue-600";
                    else if (tag.match(/Engineering|FinTech/i)) colorClass = "bg-green-50 text-green-600";
                    else if (tag.match(/Product|Design|SaaS/i)) colorClass = "bg-purple-50 text-purple-600";
                    else if (tag.match(/Startups|Marketing/i)) colorClass = "bg-amber-50 text-amber-600";

                    return <span key={tag} className={`${colorClass} text-[10px] font-bold px-2 py-0.5 rounded-md uppercase`}>{tag}</span>
                })}
             </div>

             <div className="flex gap-4 border-t border-gray-200 pt-3">
                 {[
                    { label: "Keynote", score: speakerData.keynoteScore },
                    { label: "Panel", score: speakerData.panelScore },
                    { label: "Workshop", score: speakerData.workshopScore }
                 ].map(item => (
                    <div key={item.label} className="flex-1">
                       <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">{item.label}</div>
                       <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 bottom-0 rounded-full ${item.score >= 75 ? 'bg-green-500' : item.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${item.score}%`}}></div>
                       </div>
                       <div className="text-right text-[10px] font-bold">{item.score}</div>
                    </div>
                 ))}
             </div>

             <div className="flex flex-col gap-2 mt-2">
                 <select 
                    className="w-full bg-white px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8631a]"
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                 >
                    <option value="" disabled>Select Event to Save to...</option>
                    {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
                 </select>
                 <button onClick={handleSave} className="bg-gray-900 hover:bg-black text-white font-bold py-2 rounded-xl text-sm transition-colors">
                    Save Speaker
                 </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ----- Agenda Builder Component -----
function AgendaBuilder({ useAi, apiKey, events, token }: { useAi: boolean, apiKey: string, events: EventType[], token: string | null }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [promptData, setPromptData] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [agenda, setAgenda] = useState<any[]>([]);

  const selectedEvent = events.find(e => e.eventId === selectedEventId);
  const upcomingEvents = events.filter(e => e.status === "UPCOMING");

  const handleGenerate = async () => {
    setErrorMsg("");
    setSuccessMsg("");
    setAgenda([]);

    if (!selectedEventId) {
      setErrorMsg("Please select an event first");
      return;
    }
    if (!promptData.trim()) {
      setErrorMsg("Please describe your agenda");
      return;
    }

    setLoading(true);
    try {
       const speakers = selectedEvent?.speakers || [];
       
       if (!useAi) {
           await new Promise(resolve => setTimeout(resolve, 500));
           const slots = promptData.split(',').map(s=>s.trim()).filter(Boolean);
           const generated = slots.map(slotStr => {
               const timeMatch = slotStr.match(/(\d+(:\d+)?\s*(am|pm))/i);
               const time = timeMatch ? timeMatch[0].toUpperCase() : "TBD";
               const lowerSlot = slotStr.toLowerCase();
               
               let type = "Networking";
               if (lowerSlot.match(/keynote|opening|main talk/)) type = "Keynote";
               else if (lowerSlot.match(/workshop|hands-on|deep dive/)) type = "Workshop";
               else if (lowerSlot.match(/panel|discussion|debate/)) type = "Panel";
               else if (lowerSlot.match(/fireside|chat/)) type = "Fireside";
               else if (lowerSlot.match(/q&a|ama/)) type = "Q&A";
               else if (lowerSlot.match(/registration|welcome|check-in/)) type = "Registration";
               else if (lowerSlot.match(/closing|valedictory/)) type = "Closing";
               
               let topicTags:string[] = [];
               if (lowerSlot.match(/ai|artificial intelligence/)) topicTags.push("AI");
               if (lowerSlot.match(/ml|machine learning/)) topicTags.push("ML");
               if (lowerSlot.match(/engineering|tech/)) topicTags.push("Engineering");
               if (lowerSlot.match(/data/)) topicTags.push("Data");

               let bestSpeaker = "";
               let bestScore = 0;

               if (!["Registration","Networking","Break","Lunch","Closing"].includes(type)) {
                   speakers.forEach(sp => {
                       let sScore = 0;
                       topicTags.forEach(t => {
                           if (sp.tags?.includes(t)) sScore += 30;
                       });
                       if (topicTags.some(t => sp.role?.toLowerCase().includes(t.toLowerCase()))) sScore += 10;
                       if (sScore > 100) sScore = 100;

                       if (sScore > bestScore || bestSpeaker === "") {
                           bestScore = sScore;
                           bestSpeaker = sp.name;
                       }
                   });
               } else {
                   bestScore = 100;
               }

               return {
                   time,
                   title: slotStr,
                   type,
                   duration: "60 min",
                   speaker: bestSpeaker,
                   matchScore: bestScore,
                   matchReason: bestSpeaker ? "Fallback best fit" : "Non-session"
               };
           });
           setAgenda(generated);
       } else {
           if (!apiKey) {
               setErrorMsg("Anthropic API key is required");
               setLoading(false);
               return;
           }

           const speakerSummary = speakers.map(s => 
               `${s.name} | ${s.role}, ${s.company} | tags: ${s.tags?.join(', ')} | seniority: ${s.seniority} | keynote:${s.keynoteScore} panel:${s.panelScore} workshop:${s.workshopScore}`
           ).join('\n');

           const prompt = `Agenda description: "${promptData}"\n\nAvailable speakers:\n${speakerSummary}\n\nReturn ONLY a valid JSON array, no markdown, no backticks:\n[{\n  "time": "9:00 AM",\n  "title": "session title",\n  "type": "Keynote|Panel|Fireside|Workshop|Q&A|Networking|Registration|Closing",\n  "duration": "60 min",\n  "speaker": "exact speaker name or empty string for non-session slots",\n  "matchScore": 88,\n  "matchReason": "short phrase why this speaker fits"\n}]\n\nSTRICT RULES in priority order:\nRULE 1 - NEVER DROP SLOTS: Return every slot mentioned.\nRULE 2 - SORT BY TIME: Output chronologically regardless of input order.\nRULE 3 - TOPIC MATCH IS HIGHEST PRIORITY.\nRULE 4 - BACK-TO-BACK AVOIDANCE IS SECONDARY: Only applies when scores equal.\nRULE 5 - matchScore is TOPIC FIT only (0-100).\nRULE 6 - Non-session slots set speaker to "" matchScore to 100.\nRULE 7 - Return ALL slots, no maximum limit.`;

           const res = await fetch("https://api.anthropic.com/v1/messages", {
             method: "POST",
             headers: {
               "Content-Type": "application/json",
               "x-api-key": apiKey,
               "anthropic-version": "2023-06-01",
               "anthropic-dangerous-direct-browser-access": "true"
             },
             body: JSON.stringify({
               model: "claude-3-5-sonnet-20241022",
               max_tokens: 1200,
               messages: [{ role: "user", content: prompt }]
             })
           });

           if (!res.ok) {
              const errData = await res.json();
              throw new Error(errData.error?.message || "Anthropic API error");
           }
   
           const data = await res.json();
           const textContent = data.content[0].text.trim();
           const arr = JSON.parse(textContent);
           setAgenda(arr);
       }
    } catch (e: any) {
        setErrorMsg(e.message || "Failed to generate agenda");
    }
    setLoading(false);
  };

  const handleSaveAgenda = async () => {
    if (!selectedEventId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/events/${selectedEventId}`, {
        method: "PUT", // existing event updates map to PUT in your routes
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ agenda })
      });
      if (res.ok) {
        setSuccessMsg("Agenda saved!");
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Failed to save agenda");
      }
    } catch (error: any) {
        setErrorMsg("Network error: " + error.message);
    }
  };

  const updateAgendaCell = (index: number, field: string, val: string) => {
    const updated = [...agenda];
    updated[index][field] = val;
    setAgenda(updated);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex items-center gap-3">
        <h2 className="text-lg font-bold text-gray-800">Agenda Builder</h2>
        <span className="bg-[#e8631a]/10 text-[#e8631a] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">AI powered</span>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div>
           <select 
              className="w-full bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8631a] focus:ring-1 focus:ring-[#e8631a] mb-3"
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
           >
              <option value="" disabled>Select Upcoming Event...</option>
              {upcomingEvents.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.name}</option>)}
           </select>

          <textarea 
            className="w-full bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-[#e8631a] focus:ring-1 focus:ring-[#e8631a] min-h-[100px]"
            value={promptData}
            onChange={e => setPromptData(e.target.value)}
            placeholder="9am keynote on AI, 10am panel on startups, 12pm lunch, 2pm workshop on ML, 4pm closing"
          />
          {errorMsg && <p className="text-red-500 text-xs mt-1 font-medium">{errorMsg}</p>}
          {successMsg && <p className="text-green-600 text-xs mt-1 font-medium">{successMsg}</p>}
        </div>

        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="bg-[#e8631a] hover:bg-[#d55815] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors flex justify-center items-center gap-2"
        >
          {loading ? (
             <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Assigning speakers...</>
          ) : "Generate Agenda"}
        </button>

        {agenda.length > 0 && !loading && (
          <div className="mt-4 flex flex-col gap-3">
             <div className="overflow-x-auto border border-gray-200 rounded-xl">
               <table className="w-full text-left text-xs bg-white">
                 <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                   <tr>
                     <th className="px-3 py-2 border-b border-r border-gray-200">Time / Typ</th>
                     <th className="px-3 py-2 border-b border-r border-gray-200 w-1/3">Title</th>
                     <th className="px-3 py-2 border-b border-r border-gray-200">Speaker</th>
                     <th className="px-3 py-2 border-b border-gray-200 text-center">Fit</th>
                   </tr>
                 </thead>
                 <tbody>
                   {agenda.map((slot, idx) => (
                     <tr key={idx} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                       <td className="px-3 py-2 border-r border-gray-100 align-top">
                          <input className="w-full bg-transparent border-none p-0 outline-none font-bold" value={slot.time} onChange={e=>updateAgendaCell(idx, 'time', e.target.value)}/>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase">{slot.type}</div>
                       </td>
                       <td className="px-3 py-2 border-r border-gray-100 align-top">
                          <textarea className="w-full bg-transparent border-none p-0 outline-none resize-none" rows={2} value={slot.title} onChange={e=>updateAgendaCell(idx, 'title', e.target.value)}/>
                       </td>
                       <td className="px-3 py-2 border-r border-gray-100 align-top">
                          <select className="w-full bg-transparent border-none p-0 outline-none text-xs" value={slot.speaker || ""} onChange={e=>updateAgendaCell(idx, 'speaker', e.target.value)}>
                             <option value="">- Non-Session -</option>
                             {selectedEvent?.speakers?.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                          </select>
                          <div className="text-[9px] text-gray-400 mt-1 truncate" title={slot.matchReason}>{slot.matchReason}</div>
                       </td>
                       <td className="px-3 py-2 align-middle text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${slot.matchScore >= 75 ? 'bg-green-100 text-green-700' : slot.matchScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                             {slot.matchScore}%
                          </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>

             <button onClick={handleSaveAgenda} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                Save Agenda to Event
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
