'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search, Phone, ChevronDown, Check, MessageCircle, Save, X } from 'lucide-react';
import { request, Feedback } from './forms';
import { Pill, EmptyState } from './ui';
import { leadStatuses, formatDate, type Lead, type LeadStatus, type Campaign } from '@/lib/types';
export function LeadsTable({ leads, campaigns }: { leads: Lead[]; campaigns: Campaign[] }) {
  const [rows, setRows] = useState(leads),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [campaign, setCampaign] = useState('all'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(''),
    [editing, setEditing] = useState<Lead | null>(null),
    [success, setSuccess] = useState('');
  const router = useRouter();
  const visible = rows.filter(
    (l) =>
      (l.name + l.phone).includes(query) &&
      (status === 'all' || l.status === status) &&
      (campaign === 'all' || l.campaign_id === campaign),
  );
  async function save(l: Lead) {
    setBusy(l.id);
    setError('');
    try {
      await request(`/api/leads/${l.id}`, { status: l.status, notes: l.notes }, 'PATCH');
      setRows((v) => v.map((x) => (x.id === l.id ? l : x)));
      setEditing(null);
      setSuccess('הפנייה עודכנה');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="lead-summary-row">
        {[['all', 'כל הפניות'], ...Object.entries(leadStatuses)].map(([v, label]) => (
          <button className={status === v ? 'selected' : ''} onClick={() => setStatus(v)} key={v}>
            <span>{v === 'all' ? rows.length : rows.filter((l) => l.status === v).length}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="panel leads-panel">
        <div className="list-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="חיפוש לידים"
              value={query}
              placeholder="חיפוש לפי שם או טלפון"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="inline-actions">
            <select
              aria-label="סינון לפי קמפיין"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="all">כל הקמפיינים</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <a className="button button-outline button-small" href="/api/leads/export">
              <Download size={16} />
              ייצוא CSV
            </a>
          </div>
        </div>
        <Feedback error={error} success={success} />
        {visible.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>שם הפנייה</th>
                  <th>טלפון</th>
                  <th>קמפיין</th>
                  <th>סטטוס</th>
                  <th>התקבל בתאריך</th>
                  <th>פרטים והערות</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <span className="table-name">
                        <span className="lead-avatar">{l.name.charAt(0)}</span>
                        <strong>{l.name}</strong>
                      </span>
                    </td>
                    <td>
                      <a href={`tel:${l.phone}`} className="phone-link" dir="ltr">
                        {l.phone}
                        <Phone size={13} />
                      </a>
                    </td>
                    <td>{campaigns.find((c) => c.id === l.campaign_id)?.title || 'קמפיין'}</td>
                    <td>
                      <select
                        aria-label={`סטטוס של ${l.name}`}
                        disabled={busy === l.id}
                        className={`status-select status-${l.status}`}
                        value={l.status}
                        onChange={(e) => save({ ...l, status: e.target.value as LeadStatus })}
                      >
                        {Object.entries(leadStatuses).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(l.created_at)}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          setEditing(l);
                          setError('');
                          setSuccess('');
                        }}
                      >
                        פרטי פנייה <span>↖</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="אין פניות להצגה"
            description={
              rows.length
                ? 'נסו לשנות את החיפוש או הסינון.'
                : 'פרסמו דף נחיתה ושתפו את הקישור. הפניות החדשות יופיעו כאן.'
            }
            href={!rows.length ? '/app/campaigns' : undefined}
            label="לקמפיינים שלי"
          />
        )}
      </div>
      {editing && (
        <div className="modal-scrim">
          <section
            className="lead-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lead-title"
          >
            <div className="dialog-top">
              <h2 id="lead-title">{editing.name}</h2>
              <button className="icon-button" aria-label="סגירה" onClick={() => setEditing(null)}>
                <X size={20} />
              </button>
            </div>
            <p dir="ltr">{editing.phone}</p>
            <p>{editing.email || 'לא הוזן אימייל'}</p>
            <form
              className="form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                save(editing);
              }}
            >
              <label>
                סטטוס
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as LeadStatus })}
                >
                  {Object.entries(leadStatuses).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                הערות
                <textarea
                  autoFocus
                  value={editing.notes}
                  maxLength={2000}
                  rows={5}
                  placeholder="מה כדאי לזכור לקראת השיחה הבאה?"
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                />
              </label>
              <small className="muted">
                הפנייה התקבלה בהסכמה ליצירת קשר בנוגע לטיפול. אין בכך הסכמה לדיוור שיווקי.
              </small>
              <Feedback error={error} />
              <button className="button" disabled={!!busy}>
                <Save size={16} />
                שמירת פרטי הפנייה
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
