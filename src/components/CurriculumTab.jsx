import React from 'react';
import { Download, FileText, Trash2, X } from 'lucide-react';

const CurriculumTab = ({
    curriculumList,
    selectedCurriculumId,
    setSelectedCurriculumId,
    newCurriculumTitle,
    setNewCurriculumTitle,
    newCurriculumDescription,
    setNewCurriculumDescription,
    createCurriculum,
    getCurriculumProgress,
    removeCurriculum,
    selectedCourse,
    updateCurriculumField,
    curriculumExportScope,
    setCurriculumExportScope,
    exportCurriculumByScope,
    isPdfLoading,
    newCurriculumDayLabel,
    setNewCurriculumDayLabel,
    newCurriculumDayTitle,
    setNewCurriculumDayTitle,
    addDayToCurriculum,
    dragDayInfo,
    handleDayDragStart,
    setDragDayInfo,
    handleDayDrop,
    updateCurriculumDayField,
    exportCurriculumDayPdf,
    removeCurriculumDay,
    getCurriculumDayVocabSearch,
    setCurriculumDayVocabSearch,
    vocabList,
    getDisplayDefinition,
    toggleCurriculumDayLink,
    passages,
    grammarList
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
            <section className="lg:col-span-4 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-700">
                    <FileText className="w-5 h-5" /> Khoa hoc cua ban ({curriculumList.length})
                </h2>

                <div className="space-y-2 mb-4">
                    <input
                        value={newCurriculumTitle}
                        onChange={(e) => setNewCurriculumTitle(e.target.value)}
                        placeholder="Ten khoa (VD: Khoa 1 - Nen tang)"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <textarea
                        value={newCurriculumDescription}
                        onChange={(e) => setNewCurriculumDescription(e.target.value)}
                        placeholder="Mo ta ngan cho khoa hoc"
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                    />
                    <button
                        onClick={createCurriculum}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                    >
                        + Tao khoa hoc
                    </button>
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                    {curriculumList.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-8">Chua co khoa hoc nao. Hay tao Khoa 1 truoc.</p>
                    ) : (
                        curriculumList.map(course => (
                            <div
                                key={course.id}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedCurriculumId === course.id ? 'bg-indigo-50 border-indigo-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}
                                onClick={() => setSelectedCurriculumId(course.id)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-800 truncate">{course.title}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{getCurriculumProgress(course).doneDays}/{getCurriculumProgress(course).totalDays} ngay hoan thanh ({getCurriculumProgress(course).percent}%)</p>
                                        <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${getCurriculumProgress(course).percent}%` }} />
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeCurriculum(course.id); }}
                                        className="p-1 text-slate-400 hover:text-red-500"
                                        title="Xoa khoa hoc"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                {!selectedCourse ? (
                    <div className="h-full flex items-center justify-center text-center text-slate-400">
                        <div>
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>Chon mot khoa hoc de bat dau soan giao trinh theo Day 1, Day 2...</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <input
                                    value={selectedCourse.title}
                                    onChange={(e) => updateCurriculumField(selectedCourse.id, 'title', e.target.value)}
                                    className="flex-1 min-w-[260px] text-2xl font-black text-indigo-900 bg-transparent outline-none"
                                />
                                <div className="flex items-center gap-2">
                                    <select
                                        value={curriculumExportScope}
                                        onChange={(e) => setCurriculumExportScope(e.target.value)}
                                        className="px-3 py-2 text-sm border border-indigo-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-indigo-300"
                                    >
                                        <option value="all">Xuat toan khoa</option>
                                        {(selectedCourse.days || []).map((day, idx) => (
                                            <option key={day.id} value={String(day.id)}>{`Xuat ${day.dayLabel || `Day ${idx + 1}`}`}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => exportCurriculumByScope(selectedCourse.id)}
                                        disabled={isPdfLoading}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> {isPdfLoading ? 'Dang tao PDF...' : 'Xem PDF'}
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={selectedCourse.description || ''}
                                onChange={(e) => updateCurriculumField(selectedCourse.id, 'description', e.target.value)}
                                rows={2}
                                placeholder="Mo ta lo trinh khoa hoc..."
                                className="w-full mt-2 text-sm text-slate-700 bg-white border border-indigo-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                            />
                            <div className="mt-3">
                                <div className="flex items-center justify-between text-xs font-bold text-indigo-700 mb-1">
                                    <span>Tien do khoa hoc</span>
                                    <span>{getCurriculumProgress(selectedCourse).doneDays}/{getCurriculumProgress(selectedCourse).totalDays} ngay - {getCurriculumProgress(selectedCourse).percent}%</span>
                                </div>
                                <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${getCurriculumProgress(selectedCourse).percent}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2">
                            <input
                                value={newCurriculumDayLabel}
                                onChange={(e) => setNewCurriculumDayLabel(e.target.value)}
                                placeholder="Day 1 / Day 2"
                                className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <input
                                value={newCurriculumDayTitle}
                                onChange={(e) => setNewCurriculumDayTitle(e.target.value)}
                                placeholder="Tieu de buoi hoc (VD: Cau uoc Wish)"
                                className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300"
                            />
                            <button
                                onClick={() => addDayToCurriculum(selectedCourse.id)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                            >
                                + Them Day
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                            {selectedCourse.days?.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-8">Chua co ngay hoc nao trong khoa nay.</p>
                            ) : (
                                selectedCourse.days.map((day, dayIndex) => (
                                    <div
                                        key={day.id}
                                        draggable
                                        onDragStart={() => handleDayDragStart(selectedCourse.id, day.id)}
                                        onDragEnd={() => setDragDayInfo(null)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => handleDayDrop(selectedCourse.id, day.id)}
                                        className={`border rounded-2xl p-4 bg-slate-50/70 ${dragDayInfo?.dayId === day.id ? 'border-indigo-400 bg-indigo-50/60' : 'border-slate-200'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-slate-400 text-xs cursor-grab active:cursor-grabbing select-none" title="Keo de doi thu tu">↕</span>
                                                <span className="px-2 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">{day.dayLabel || `Day ${dayIndex + 1}`}</span>
                                                <input
                                                    value={day.title || ''}
                                                    onChange={(e) => updateCurriculumDayField(selectedCourse.id, day.id, 'title', e.target.value)}
                                                    placeholder="Tieu de buoi hoc"
                                                    className="min-w-0 flex-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-300"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button
                                                    onClick={() => exportCurriculumDayPdf(selectedCourse.id, day.id)}
                                                    className="px-2 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                                    title="Xuat PDF rieng day nay"
                                                >
                                                    PDF Day
                                                </button>
                                                <label className="flex items-center gap-1 text-xs font-bold text-slate-600 px-2 py-1 rounded-lg bg-white border border-slate-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(day.done)}
                                                        onChange={(e) => updateCurriculumDayField(selectedCourse.id, day.id, 'done', e.target.checked)}
                                                    />
                                                    Done
                                                </label>
                                                <button onClick={() => removeCurriculumDay(selectedCourse.id, day.id)} className="p-1 text-slate-400 hover:text-red-500" title="Xoa day"><X className="w-4 h-4" /></button>
                                            </div>
                                        </div>

                                        <textarea
                                            value={day.objective || ''}
                                            onChange={(e) => updateCurriculumDayField(selectedCourse.id, day.id, 'objective', e.target.value)}
                                            rows={2}
                                            placeholder="Muc tieu cua day nay..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tu vung lien quan</p>
                                                <input
                                                    value={getCurriculumDayVocabSearch(day.id)}
                                                    onChange={(e) => setCurriculumDayVocabSearch(prev => ({ ...prev, [day.id]: e.target.value }))}
                                                    placeholder="Tim tu vung nhanh..."
                                                    className="w-full px-2 py-1.5 mb-2 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-300"
                                                />
                                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                    {vocabList.length === 0 ? <p className="text-xs text-slate-400">Chua co tu vung</p> : vocabList
                                                        .filter(v => {
                                                            const kw = getCurriculumDayVocabSearch(day.id).trim().toLowerCase();
                                                            if (!kw) return true;
                                                            return String(v.word || '').toLowerCase().includes(kw) || String(getDisplayDefinition(v) || '').toLowerCase().includes(kw);
                                                        })
                                                        .slice(0, 50)
                                                        .map(v => (
                                                            <label key={v.id} className="flex items-center gap-2 text-xs text-slate-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(day.vocabIds || []).includes(v.id)}
                                                                    onChange={() => toggleCurriculumDayLink(selectedCourse.id, day.id, 'vocabIds', v.id)}
                                                                />
                                                                <span className="truncate">{v.word} - {getDisplayDefinition(v)}</span>
                                                            </label>
                                                        ))}
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Bai doc lien quan</p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                    {passages.length === 0 ? <p className="text-xs text-slate-400">Chua co bai doc</p> : passages.map(p => (
                                                        <label key={p.id} className="flex items-center gap-2 text-xs text-slate-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={(day.passageIds || []).includes(p.id)}
                                                                onChange={() => toggleCurriculumDayLink(selectedCourse.id, day.id, 'passageIds', p.id)}
                                                            />
                                                            <span className="truncate">{p.title}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ngu phap lien quan</p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                                    {grammarList.length === 0 ? <p className="text-xs text-slate-400">Chua co bai ngu phap</p> : grammarList.map(g => (
                                                        <label key={g.id} className="flex items-center gap-2 text-xs text-slate-700">
                                                            <input
                                                                type="checkbox"
                                                                checked={(day.grammarIds || []).includes(g.id)}
                                                                onChange={() => toggleCurriculumDayLink(selectedCourse.id, day.id, 'grammarIds', g.id)}
                                                            />
                                                            <span className="truncate">{g.title}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <textarea
                                            value={day.notes || ''}
                                            onChange={(e) => updateCurriculumDayField(selectedCourse.id, day.id, 'notes', e.target.value)}
                                            rows={2}
                                            placeholder="Ghi chu trien khai (bai tap, deadline, checklist...)"
                                            className="w-full mt-3 px-3 py-2 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
};

export default CurriculumTab;
