
import { DoctorCapacity, WaitlistEntry } from '../types';

const STORAGE_KEY_CAPACITY = 'med_ai_doctor_capacity';
const STORAGE_KEY_WAITLIST = 'med_ai_waitlist';

const DOCTOR_CONFIG = {
    maxPatientsPerDay: 20,
    emergencyBuffer: 3,
};

// ─── Capacity Management ───────────────────────────────────────────────────

function loadCapacities(): DoctorCapacity[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_CAPACITY) || '[]');
    } catch { return []; }
}

function saveCapacities(caps: DoctorCapacity[]) {
    localStorage.setItem(STORAGE_KEY_CAPACITY, JSON.stringify(caps));
}

function getOrCreateCapacity(specialty: string, date: string): DoctorCapacity {
    const caps = loadCapacities();
    const existing = caps.find(c => c.specialty === specialty && c.date === date);
    if (existing) return existing;
    return {
        specialty,
        maxPatientsPerDay: DOCTOR_CONFIG.maxPatientsPerDay,
        emergencyBuffer: DOCTOR_CONFIG.emergencyBuffer,
        date,
        booked: 0,
    };
}

export function canBook(specialty: string, date: string): boolean {
    const cap = getOrCreateCapacity(specialty, date);
    return cap.booked < (cap.maxPatientsPerDay - cap.emergencyBuffer);
}

export function incrementBooking(specialty: string, date: string) {
    const caps = loadCapacities();
    const idx = caps.findIndex(c => c.specialty === specialty && c.date === date);
    if (idx >= 0) {
        caps[idx].booked += 1;
    } else {
        caps.push({ ...getOrCreateCapacity(specialty, date), booked: 1 });
    }
    saveCapacities(caps);
}

export function decrementBooking(specialty: string, date: string) {
    const caps = loadCapacities();
    const idx = caps.findIndex(c => c.specialty === specialty && c.date === date);
    if (idx >= 0 && caps[idx].booked > 0) {
        caps[idx].booked -= 1;
        saveCapacities(caps);
    }
}

export function getCapacityInfo(specialty: string, date: string): { booked: number; available: number; isFull: boolean } {
    const cap = getOrCreateCapacity(specialty, date);
    const available = Math.max(0, cap.maxPatientsPerDay - cap.emergencyBuffer - cap.booked);
    return { booked: cap.booked, available, isFull: available === 0 };
}

export function getNextAvailableDate(specialty: string, afterDate: string): string {
    const caps = loadCapacities().filter(c => c.specialty === specialty);
    const date = new Date(afterDate);
    for (let i = 1; i <= 14; i++) {
        date.setDate(date.getDate() + 1);
        const dateStr = date.toISOString().split('T')[0];
        const cap = caps.find(c => c.date === dateStr);
        if (!cap || cap.booked < cap.maxPatientsPerDay - cap.emergencyBuffer) {
            return dateStr;
        }
    }
    return afterDate;
}

// ─── Waitlist Management ───────────────────────────────────────────────────

function loadWaitlist(): WaitlistEntry[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_WAITLIST) || '[]');
    } catch { return []; }
}

function saveWaitlist(list: WaitlistEntry[]) {
    localStorage.setItem(STORAGE_KEY_WAITLIST, JSON.stringify(list));
}

export function addToWaitlist(entry: Omit<WaitlistEntry, 'id' | 'createdAt' | 'notified'>): WaitlistEntry {
    const list = loadWaitlist();
    const newEntry: WaitlistEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        notified: false,
    };
    list.push(newEntry);
    saveWaitlist(list);
    return newEntry;
}

export function getWaitlist(): WaitlistEntry[] {
    return loadWaitlist().sort((a, b) => b.severityScore - a.severityScore || a.createdAt - b.createdAt);
}

export function removeFromWaitlist(id: string) {
    const list = loadWaitlist().filter(e => e.id !== id);
    saveWaitlist(list);
}

// When a slot opens, notify the next person in queue
export function promoteFromWaitlist(specialty: string, date: string): WaitlistEntry | null {
    const list = getWaitlist();
    const next = list.find(e => e.doctorSpecialty === specialty && e.preferredDate === date);
    if (next) {
        removeFromWaitlist(next.id);
        return { ...next, notified: true };
    }
    return null;
}

export function getWaitlistPosition(id: string): number {
    const list = getWaitlist();
    return list.findIndex(e => e.id === id) + 1;
}

// Load prediction (simulated with historical patterns)
export function predictLoad(daysAhead = 14): Array<{ date: string; expected: number; risk: 'low' | 'normal' | 'high' | 'critical' }> {
    const result = [];
    const base = new Date();
    const caps = loadCapacities();

    for (let i = 0; i < daysAhead; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();

        // Simulate realistic patterns: Mon/Tue = high, Wed = normal, Thu/Fri = moderate, weekends = low
        const pattern = [3, 9, 7, 4, 6, 5, 2];
        const baseLoad = pattern[dayOfWeek] * 2;
        const booked = caps.find(c => c.date === dateStr)?.booked || 0;
        const expected = baseLoad + booked;

        let risk: 'low' | 'normal' | 'high' | 'critical' = 'low';
        if (expected >= 18) risk = 'critical';
        else if (expected >= 14) risk = 'high';
        else if (expected >= 8) risk = 'normal';

        result.push({ date: dateStr, expected, risk });
    }
    return result;
}
