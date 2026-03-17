const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'appstore');
const WIDTH = 1290;
const HEIGHT = 2796;

// Theme colors from theme.ts
const C = {
  primary: '#475569',
  primaryLight: '#94A3B8',
  primaryDark: '#334155',
  secondary: '#059669',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
};

const FONT = `-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif`;

function iphoneFrame(screenHTML) {
  return `
    <div style="
      width: 380px; height: 780px;
      border-radius: 52px;
      border: 6px solid #1E293B;
      background: ${C.background};
      overflow: hidden;
      position: relative;
      box-shadow: 0 25px 80px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.1);
    ">
      <!-- Status bar -->
      <div style="
        height: 54px; padding: 14px 28px 0;
        display: flex; justify-content: space-between; align-items: center;
        background: ${C.background};
      ">
        <span style="font-size: 16px; font-weight: 600; color: ${C.text}; font-family: ${FONT};">9:41</span>
        <div style="
          width: 120px; height: 32px;
          background: #0F172A;
          border-radius: 20px;
          position: absolute; left: 50%; transform: translateX(-50%); top: 10px;
        "></div>
        <div style="display: flex; gap: 5px; align-items: center;">
          <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="3" width="3" height="9" rx="1" fill="${C.text}"/><rect x="5" y="2" width="3" height="10" rx="1" fill="${C.text}"/><rect x="10" y="0" width="3" height="12" rx="1" fill="${C.text}"/><rect x="15" y="1" width="3" height="11" rx="1" fill="${C.text}"/></svg>
          <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 3C10.7 3 13.1 4.2 14.7 6.1L16 4.7C14 2.4 11.2 1 8 1S2 2.4 0 4.7L1.3 6.1C2.9 4.2 5.3 3 8 3Z" fill="${C.text}"/><path d="M8 7C9.7 7 11.2 7.7 12.2 8.9L13.5 7.5C12.1 5.9 10.2 5 8 5S3.9 5.9 2.5 7.5L3.8 8.9C4.8 7.7 6.3 7 8 7Z" fill="${C.text}"/><circle cx="8" cy="11" r="2" fill="${C.text}"/></svg>
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0" y="0" width="23" height="13" rx="3" stroke="${C.text}" stroke-width="1.5" fill="none"/><rect x="2" y="2" width="18" height="9" rx="1.5" fill="${C.success}"/><rect x="24.5" y="4" width="2.5" height="5" rx="1" fill="${C.text}"/></svg>
        </div>
      </div>
      <!-- Screen content -->
      <div style="height: 726px; overflow: hidden; background: ${C.background};">
        ${screenHTML}
      </div>
    </div>
  `;
}

function wrapScreenshot(caption, phoneHTML, bgGradient) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    font-family: ${FONT};
    background: ${bgGradient};
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    padding-top: 180px;
    overflow: hidden;
  }
  .caption {
    color: #FFFFFF;
    font-size: 72px;
    font-weight: 700;
    text-align: center;
    max-width: 1050px;
    line-height: 1.15;
    margin-bottom: 60px;
    letter-spacing: -1px;
    text-shadow: 0 2px 20px rgba(0,0,0,0.15);
    flex-shrink: 0;
  }
  .phone-container {
    transform: scale(2.2);
    transform-origin: top center;
    flex-shrink: 0;
  }
</style></head><body>
  <div class="caption">${caption}</div>
  <div class="phone-container">
    ${phoneHTML}
  </div>
</body></html>`;
}

// --- Screen 1: Home Dashboard ---
function homeScreen() {
  const surveys = [
    { title: 'Customer Satisfaction Q1', responses: 247, status: 'Active', statusColor: C.success },
    { title: 'Product Feedback 2026', responses: 183, status: 'Active', statusColor: C.success },
    { title: 'Employee Wellness', responses: 56, status: 'Draft', statusColor: C.warning },
    { title: 'Event Planning Survey', responses: 412, status: 'Closed', statusColor: C.textTertiary },
  ];
  return `
    <div style="padding: 0 20px;">
      <!-- Header -->
      <div style="padding: 12px 0 16px;">
        <div style="font-size: 14px; color: ${C.textSecondary}; font-family: ${FONT}; font-weight: 500;">Good morning,</div>
        <div style="font-size: 28px; font-weight: 700; color: ${C.text}; font-family: ${FONT}; letter-spacing: 0.3px;">Alex Johnson</div>
      </div>
      <!-- Stats -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        ${[
          { label: 'Active', value: '12', icon: '●', iconColor: C.success },
          { label: 'Drafts', value: '3', icon: '●', iconColor: C.warning },
          { label: 'Responses', value: '1.2k', icon: '●', iconColor: C.primary },
        ].map(s => `
          <div style="
            flex: 1; background: ${C.surface}; border-radius: 16px; padding: 14px;
            border: 1px solid ${C.border};
          ">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="color: ${s.iconColor}; font-size: 8px;">●</span>
              <span style="font-size: 12px; color: ${C.textSecondary}; font-family: ${FONT};">${s.label}</span>
            </div>
            <div style="font-size: 24px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">${s.value}</div>
          </div>
        `).join('')}
      </div>
      <!-- Section header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 18px; font-weight: 600; color: ${C.text}; font-family: ${FONT};">Recent Surveys</span>
        <span style="font-size: 14px; color: ${C.primary}; font-family: ${FONT}; font-weight: 500;">See All</span>
      </div>
      <!-- Survey list -->
      ${surveys.map(s => `
        <div style="
          background: ${C.surface}; border-radius: 14px; padding: 16px;
          margin-bottom: 10px; border: 1px solid ${C.border};
          display: flex; justify-content: space-between; align-items: center;
        ">
          <div>
            <div style="font-size: 15px; font-weight: 600; color: ${C.text}; font-family: ${FONT}; margin-bottom: 4px;">${s.title}</div>
            <div style="font-size: 13px; color: ${C.textSecondary}; font-family: ${FONT};">${s.responses} responses</div>
          </div>
          <div style="
            padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
            color: ${s.statusColor}; background: ${s.statusColor}15;
            font-family: ${FONT};
          ">${s.status}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// --- Screen 2: Create Survey ---
function createScreen() {
  return `
    <div style="padding: 0 20px;">
      <div style="padding: 12px 0 6px;">
        <div style="font-size: 28px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">Create Survey</div>
      </div>
      <!-- Step indicator -->
      <div style="display: flex; align-items: center; gap: 8px; margin: 16px 0 24px;">
        ${[
          { num: '1', label: 'Details', active: false, done: true },
          { num: '2', label: 'Questions', active: true, done: false },
          { num: '3', label: 'Settings', active: false, done: false },
        ].map(s => `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
            <div style="
              width: 100%; height: 4px; border-radius: 2px;
              background: ${s.done || s.active ? C.primary : C.border};
            "></div>
            <span style="font-size: 11px; color: ${s.active ? C.primary : C.textTertiary}; font-weight: ${s.active ? '600' : '400'}; font-family: ${FONT};">${s.label}</span>
          </div>
        `).join('')}
      </div>
      <!-- Question being added -->
      <div style="
        background: ${C.surface}; border-radius: 16px; padding: 18px;
        border: 2px solid ${C.primary}20; margin-bottom: 14px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-size: 12px; font-weight: 600; color: ${C.primary}; font-family: ${FONT}; text-transform: uppercase; letter-spacing: 0.5px;">Question 1</span>
          <span style="font-size: 12px; color: ${C.textSecondary}; font-family: ${FONT};">Multiple Choice</span>
        </div>
        <div style="font-size: 16px; font-weight: 600; color: ${C.text}; font-family: ${FONT}; margin-bottom: 14px;">How satisfied are you with our service?</div>
        ${['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied'].map((opt, i) => `
          <div style="
            display: flex; align-items: center; gap: 10px; padding: 10px 14px;
            background: ${i === 0 ? C.primary + '10' : C.surfaceSecondary}; border-radius: 10px; margin-bottom: 6px;
            border: 1px solid ${i === 0 ? C.primary + '30' : 'transparent'};
          ">
            <div style="
              width: 20px; height: 20px; border-radius: 10px;
              border: 2px solid ${i === 0 ? C.primary : C.textTertiary};
              ${i === 0 ? `background: ${C.primary};` : ''}
              display: flex; align-items: center; justify-content: center;
            ">${i === 0 ? `<div style="width: 8px; height: 8px; border-radius: 4px; background: white;"></div>` : ''}</div>
            <span style="font-size: 14px; color: ${C.text}; font-family: ${FONT};">${opt}</span>
          </div>
        `).join('')}
      </div>
      <!-- Add question button -->
      <div style="
        border: 2px dashed ${C.border}; border-radius: 14px; padding: 16px;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      ">
        <div style="
          width: 24px; height: 24px; border-radius: 12px; background: ${C.primary};
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 18px; font-weight: 300; line-height: 1;
        ">+</div>
        <span style="font-size: 15px; font-weight: 500; color: ${C.primary}; font-family: ${FONT};">Add Question</span>
      </div>
    </div>
  `;
}

// --- Screen 3: Survey Detail ---
function detailScreen() {
  return `
    <div style="padding: 0 20px;">
      <div style="padding: 12px 0 6px;">
        <div style="font-size: 13px; color: ${C.primary}; font-family: ${FONT}; font-weight: 500; margin-bottom: 4px;">← Back</div>
        <div style="font-size: 24px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">Customer Satisfaction Q1</div>
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
          <div style="padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; color: ${C.success}; background: ${C.success}15; font-family: ${FONT};">Active</div>
          <span style="font-size: 13px; color: ${C.textSecondary}; font-family: ${FONT};">Created Mar 1, 2026</span>
        </div>
      </div>
      <!-- Analytics cards -->
      <div style="display: flex; gap: 10px; margin: 18px 0;">
        ${[
          { label: 'Total Responses', value: '247', change: '+23 this week', changeColor: C.success },
          { label: 'Completion Rate', value: '94%', change: '+2% vs last', changeColor: C.success },
        ].map(s => `
          <div style="
            flex: 1; background: ${C.surface}; border-radius: 16px; padding: 16px;
            border: 1px solid ${C.border};
          ">
            <div style="font-size: 12px; color: ${C.textSecondary}; font-family: ${FONT}; margin-bottom: 6px;">${s.label}</div>
            <div style="font-size: 28px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">${s.value}</div>
            <div style="font-size: 11px; color: ${s.changeColor}; font-family: ${FONT}; margin-top: 4px;">${s.change}</div>
          </div>
        `).join('')}
      </div>
      <!-- Chart area -->
      <div style="
        background: ${C.surface}; border-radius: 16px; padding: 16px;
        border: 1px solid ${C.border}; margin-bottom: 14px;
      ">
        <div style="font-size: 14px; font-weight: 600; color: ${C.text}; font-family: ${FONT}; margin-bottom: 14px;">Response Trend</div>
        <svg width="300" height="100" viewBox="0 0 300 100">
          <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${C.primary}" stop-opacity="0.15"/><stop offset="100%" stop-color="${C.primary}" stop-opacity="0.01"/></linearGradient></defs>
          <path d="M0,80 C30,75 60,60 90,55 C120,50 150,35 180,30 C210,25 240,15 270,18 L300,12 L300,100 L0,100 Z" fill="url(#g1)"/>
          <path d="M0,80 C30,75 60,60 90,55 C120,50 150,35 180,30 C210,25 240,15 270,18 L300,12" fill="none" stroke="${C.primary}" stroke-width="2.5"/>
          <circle cx="270" cy="18" r="5" fill="${C.primary}"/>
        </svg>
        <div style="display: flex; justify-content: space-between; margin-top: 6px;">
          ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<span style="font-size: 10px; color: ${C.textTertiary}; font-family: ${FONT};">${d}</span>`).join('')}
        </div>
      </div>
      <!-- Share link -->
      <div style="
        background: ${C.primary}08; border-radius: 14px; padding: 14px;
        border: 1px solid ${C.primary}20; display: flex; align-items: center; justify-content: space-between;
      ">
        <div>
          <div style="font-size: 13px; font-weight: 600; color: ${C.text}; font-family: ${FONT};">Share Link</div>
          <div style="font-size: 12px; color: ${C.textSecondary}; font-family: ${FONT}; margin-top: 2px;">surve.app/s/csat-q1</div>
        </div>
        <div style="
          padding: 8px 16px; border-radius: 10px; background: ${C.primary};
          color: white; font-size: 13px; font-weight: 600; font-family: ${FONT};
        ">Copy</div>
      </div>
    </div>
  `;
}

// --- Screen 4: Responses ---
function responsesScreen() {
  const responses = [
    { name: 'Sarah Miller', time: '2 min ago', score: '9/10', avatar: 'SM' },
    { name: 'James Wilson', time: '15 min ago', score: '8/10', avatar: 'JW' },
    { name: 'Emily Chen', time: '1 hr ago', score: '10/10', avatar: 'EC' },
    { name: 'Michael Brown', time: '2 hrs ago', score: '7/10', avatar: 'MB' },
    { name: 'Lisa Anderson', time: '3 hrs ago', score: '9/10', avatar: 'LA' },
  ];
  return `
    <div style="padding: 0 20px;">
      <div style="padding: 12px 0 16px;">
        <div style="font-size: 28px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">Responses</div>
        <div style="font-size: 14px; color: ${C.textSecondary}; font-family: ${FONT}; margin-top: 2px;">Customer Satisfaction Q1</div>
      </div>
      <!-- Filter tabs -->
      <div style="display: flex; gap: 8px; margin-bottom: 18px;">
        ${['All (247)', 'Today (23)', 'This Week (89)'].map((t, i) => `
          <div style="
            padding: 7px 14px; border-radius: 20px; font-size: 13px; font-weight: ${i === 0 ? '600' : '400'};
            background: ${i === 0 ? C.primary : C.surfaceSecondary};
            color: ${i === 0 ? 'white' : C.textSecondary};
            font-family: ${FONT};
          ">${t}</div>
        `).join('')}
      </div>
      <!-- Response list -->
      ${responses.map(r => `
        <div style="
          display: flex; align-items: center; gap: 12px; padding: 14px;
          background: ${C.surface}; border-radius: 14px; margin-bottom: 8px;
          border: 1px solid ${C.border};
        ">
          <div style="
            width: 42px; height: 42px; border-radius: 21px; background: ${C.primary}15;
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; font-weight: 600; color: ${C.primary}; font-family: ${FONT};
          ">${r.avatar}</div>
          <div style="flex: 1;">
            <div style="font-size: 15px; font-weight: 600; color: ${C.text}; font-family: ${FONT};">${r.name}</div>
            <div style="font-size: 12px; color: ${C.textSecondary}; font-family: ${FONT}; margin-top: 1px;">${r.time}</div>
          </div>
          <div style="
            padding: 4px 10px; border-radius: 8px; background: ${C.success}12;
            font-size: 14px; font-weight: 600; color: ${C.success}; font-family: ${FONT};
          ">${r.score}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// --- Screen 5: Question Types ---
function questionTypesScreen() {
  const types = [
    { name: 'Multiple Choice', icon: '☰', desc: '4 options', preview: `
      <div style="display:flex;flex-direction:column;gap:4px;">
        ${['Option A','Option B','Option C'].map((o,i) => `<div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:${i===0?C.primary+'12':C.surfaceSecondary};border-radius:6px;font-size:10px;color:${C.text};font-family:${FONT};"><div style="width:12px;height:12px;border-radius:6px;border:1.5px solid ${i===0?C.primary:C.textTertiary};${i===0?`background:${C.primary}`:''};"></div>${o}</div>`).join('')}
      </div>
    `},
    { name: 'Rating Scale', icon: '★', desc: '1-5 stars', preview: `
      <div style="display:flex;gap:4px;padding:4px 0;">
        ${[1,2,3,4,5].map(i => `<div style="width:28px;height:28px;border-radius:6px;background:${i<=4?C.warning+'20':C.surfaceSecondary};display:flex;align-items:center;justify-content:center;font-size:14px;color:${i<=4?C.warning:C.textTertiary};">★</div>`).join('')}
      </div>
    `},
    { name: 'Free Text', icon: 'T', desc: 'Open-ended', preview: `
      <div style="padding:8px 10px;background:${C.surfaceSecondary};border-radius:8px;border:1px solid ${C.border};font-size:11px;color:${C.textTertiary};font-family:${FONT};">Type your answer...</div>
    `},
    { name: 'NPS Score', icon: '◎', desc: '0-10 scale', preview: `
      <div style="display:flex;gap:2px;">
        ${[0,1,2,3,4,5,6,7,8,9,10].map(i => `<div style="width:16px;height:22px;border-radius:4px;background:${i>=9?C.success+'25':i>=7?C.warning+'20':C.error+'15'};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:${i>=9?C.success:i>=7?C.warning:C.error};font-family:${FONT};">${i}</div>`).join('')}
      </div>
    `},
    { name: 'Yes / No', icon: '◐', desc: 'Binary choice', preview: `
      <div style="display:flex;gap:8px;">
        <div style="flex:1;padding:8px;border-radius:8px;background:${C.success}15;text-align:center;font-size:13px;font-weight:600;color:${C.success};font-family:${FONT};">Yes</div>
        <div style="flex:1;padding:8px;border-radius:8px;background:${C.surfaceSecondary};text-align:center;font-size:13px;font-weight:500;color:${C.textSecondary};font-family:${FONT};">No</div>
      </div>
    `},
  ];
  return `
    <div style="padding: 0 20px;">
      <div style="padding: 12px 0 16px;">
        <div style="font-size: 28px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">Question Types</div>
        <div style="font-size: 14px; color: ${C.textSecondary}; font-family: ${FONT}; margin-top: 2px;">Choose from 5 powerful types</div>
      </div>
      ${types.map(t => `
        <div style="
          background: ${C.surface}; border-radius: 16px; padding: 16px;
          margin-bottom: 10px; border: 1px solid ${C.border};
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="
              width: 36px; height: 36px; border-radius: 10px; background: ${C.primary}12;
              display: flex; align-items: center; justify-content: center;
              font-size: 18px; color: ${C.primary};
            ">${t.icon}</div>
            <div>
              <div style="font-size: 15px; font-weight: 600; color: ${C.text}; font-family: ${FONT};">${t.name}</div>
              <div style="font-size: 11px; color: ${C.textSecondary}; font-family: ${FONT};">${t.desc}</div>
            </div>
          </div>
          ${t.preview}
        </div>
      `).join('')}
    </div>
  `;
}

// --- Screen 6: Profile ---
function profileScreen() {
  return `
    <div style="padding: 0 20px;">
      <div style="padding: 20px 0 12px; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 72px; height: 72px; border-radius: 36px; background: ${C.primary};
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 600; color: white; font-family: ${FONT};
          margin-bottom: 10px;
        ">AJ</div>
        <div style="font-size: 20px; font-weight: 700; color: ${C.text}; font-family: ${FONT};">Alex Johnson</div>
        <div style="font-size: 14px; color: ${C.textSecondary}; font-family: ${FONT}; margin-top: 2px;">alex@company.com</div>
        <div style="
          margin-top: 8px; padding: 4px 14px; border-radius: 20px;
          background: ${C.primary}12; font-size: 12px; font-weight: 600;
          color: ${C.primary}; font-family: ${FONT};
        ">Pro Plan</div>
      </div>
      <!-- Preferences -->
      <div style="margin-top: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: ${C.textTertiary}; font-family: ${FONT}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-left: 4px;">Preferences</div>
        <div style="background: ${C.surface}; border-radius: 14px; border: 1px solid ${C.border}; overflow: hidden;">
          ${[
            { label: 'Dark Mode', right: `<div style="width:44px;height:26px;border-radius:13px;background:${C.surfaceSecondary};padding:2px;"><div style="width:22px;height:22px;border-radius:11px;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div></div>` },
            { label: 'Notifications', right: `<div style="width:44px;height:26px;border-radius:13px;background:${C.success};padding:2px;display:flex;justify-content:flex-end;"><div style="width:22px;height:22px;border-radius:11px;background:white;box-shadow:0 1px 3px rgba(0,0,0,0.15);"></div></div>` },
            { label: 'Email Digests', right: `<span style="font-size:13px;color:${C.textTertiary};font-family:${FONT};">Weekly →</span>` },
          ].map((item, i, arr) => `
            <div style="
              display: flex; justify-content: space-between; align-items: center;
              padding: 15px 16px;
              ${i < arr.length - 1 ? `border-bottom: 1px solid ${C.border};` : ''}
            ">
              <span style="font-size: 15px; color: ${C.text}; font-family: ${FONT};">${item.label}</span>
              ${item.right}
            </div>
          `).join('')}
        </div>
      </div>
      <!-- Support -->
      <div style="margin-top: 18px;">
        <div style="font-size: 12px; font-weight: 600; color: ${C.textTertiary}; font-family: ${FONT}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-left: 4px;">Support</div>
        <div style="background: ${C.surface}; border-radius: 14px; border: 1px solid ${C.border}; overflow: hidden;">
          ${['Help Center', 'Terms of Service', 'Privacy Policy'].map((label, i, arr) => `
            <div style="
              display: flex; justify-content: space-between; align-items: center;
              padding: 15px 16px;
              ${i < arr.length - 1 ? `border-bottom: 1px solid ${C.border};` : ''}
            ">
              <span style="font-size: 15px; color: ${C.text}; font-family: ${FONT};">${label}</span>
              <span style="font-size: 14px; color: ${C.textTertiary};">→</span>
            </div>
          `).join('')}
        </div>
      </div>
      <!-- Sign out -->
      <div style="
        margin-top: 18px; padding: 14px; border-radius: 14px;
        background: ${C.error}08; text-align: center;
        font-size: 15px; font-weight: 600; color: ${C.error}; font-family: ${FONT};
      ">Sign Out</div>
    </div>
  `;
}

const screenshots = [
  {
    name: '01_home_dashboard',
    caption: 'Create & manage surveys<br>effortlessly',
    screen: homeScreen,
    gradient: 'linear-gradient(160deg, #334155 0%, #1E293B 40%, #0F172A 100%)',
  },
  {
    name: '02_create_survey',
    caption: 'Build surveys in seconds',
    screen: createScreen,
    gradient: 'linear-gradient(160deg, #1E293B 0%, #334155 50%, #475569 100%)',
  },
  {
    name: '03_survey_detail',
    caption: 'Track responses in real-time',
    screen: detailScreen,
    gradient: 'linear-gradient(160deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
  },
  {
    name: '04_responses',
    caption: 'Collect insights that matter',
    screen: responsesScreen,
    gradient: 'linear-gradient(160deg, #334155 0%, #475569 50%, #334155 100%)',
  },
  {
    name: '05_question_types',
    caption: '5 powerful question types',
    screen: questionTypesScreen,
    gradient: 'linear-gradient(160deg, #1E293B 0%, #0F172A 50%, #334155 100%)',
  },
  {
    name: '06_profile',
    caption: 'Personalize your experience',
    screen: profileScreen,
    gradient: 'linear-gradient(160deg, #475569 0%, #334155 50%, #1E293B 100%)',
  },
];

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium-browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  for (const ss of screenshots) {
    console.log(`Rendering ${ss.name}...`);
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

    const phoneHTML = iphoneFrame(ss.screen());
    const html = wrapScreenshot(ss.caption, phoneHTML, ss.gradient);

    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `${ss.name}.png`),
      type: 'png',
    });
    await page.close();
  }

  await browser.close();
  console.log('All screenshots generated!');
}

main().catch(console.error);
