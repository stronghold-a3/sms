// ============================================================================
// SECURITY MANAGEMENT SYSTEM — MOCK DATA & TYPE DEFINITIONS
// ============================================================================
// ⚠️  THIS FILE CONTAINS MOCK / STUB DATA FOR DEVELOPMENT & TESTING ONLY.
//     All data here is fictitious. In production, these records must be
//     replaced by API calls to the backend (Supabase / PostgreSQL).
//
//     NEVER add real credentials, password hashes, or secrets to this file.
// ============================================================================

// Logo URL — public Supabase Storage asset
// FIX: previously pointed at a different Supabase project
// (fhwhqoiucfxmfsclianh.databasepad.com) than the one the app actually
// authenticates against in src/lib/supabase.ts (zpahlcmuowwwiauffrby).
// All public asset URLs in this file now resolve against the SAME
// project so Storage RLS / bucket policies stay consistent with auth.
const SUPABASE_PROJECT_URL = 'https://zpahlcmuowwwiauffrby.supabase.co';

export const LOGO =
  `${SUPABASE_PROJECT_URL}/storage/v1/object/public/sop-files/public/Stronghold%20A3%20Logo-3.jpg`;

/** Public marketing / documentation site for Stronghold A3 */
export const SITE_URL = 'https://stronghold-a3.github.io/online/';

/**
 * Official Stronghold A3 resource library (single source of truth).
 * Surfaced in the sidebar "Resources" panel and the landing footer.
 */
export interface ResourceLink {
  label: string;
  url: string;
}

export const RESOURCES: ResourceLink[] = [
  { label: 'Accessibility Policy', url: 'https://stronghold-a3.github.io/online/accessibility-policy.html' },
  { label: 'Emergency Business Continuity Plans', url: 'https://stronghold-a3.github.io/online/bcp.html' },
  { label: 'Capability Statement', url: 'https://stronghold-a3.github.io/online/capability.html' },
  { label: 'Cookie Policy', url: 'https://stronghold-a3.github.io/online/cookie-policy.html' },
  { label: 'Digital Bayanihan', url: 'https://stronghold-a3.github.io/online/digital-bayanihan.html' },
  { label: 'External Integrations', url: 'https://stronghold-a3.github.io/online/external.html' },
  { label: 'Operational Workflows', url: `${SUPABASE_PROJECT_URL}/storage/v1/object/public/sms-resources/public/Crisis-Proof%20Operational%20Workflows-Diagram.pdf` },
  { label: 'Policies', url: 'https://stronghold-a3.github.io/online/policies.html' },
  { label: 'Crisis-Proof Priority Protocols', url: 'https://stronghold-a3.github.io/online/priority-protocols.html' },
  { label: 'Privacy Policy', url: 'https://stronghold-a3.github.io/online/privacy-policy.html' },
  { label: 'RACI Protocol', url: 'https://stronghold-a3.github.io/online/raci-protocol.html' },
  { label: 'Security Risk Assessment', url: 'https://stronghold-a3.github.io/online/security-assessment.html' },
  { label: 'Terms of Services', url: 'https://stronghold-a3.github.io/online/terms.html' },
];

const portraits = [
  'https://d64gsuwffb70l.cloudfront.net/6a26ccfe1522feea66d490f4_1780927972793_09ce97a9.png',
  'https://d64gsuwffb70l.cloudfront.net/6a26ccfe1522feea66d490f4_1780927976760_04c0eab5.png',
  'https://d64gsuwffb70l.cloudfront.net/6a26ccfe1522feea66d490f4_1780927976384_5711c2ad.png',
  'https://d64gsuwffb70l.cloudfront.net/6a26ccfe1522feea66d490f4_1780927977895_1ef2f244.png',
];

// ============================================================================
// ROLE SYSTEM — CROSS-MODULE COMPATIBILITY
// ============================================================================

/**
 * Auth-facing roles (used in AuthContext.tsx — lowercase, simplified).
 * These are the roles stored in the profiles table and used for RBAC.
 */
export type AuthRole = 'guard' | 'supervisor' | 'ops' | 'admin';

/**
 * Backend/database roles (used in the users table — TitleCase, granular).
 * These map to the canonical roles in the database schema.
 */
export type DbRole =
  | 'Superadmin'
  | 'Admin'
  | 'Ops_Manager'
  | 'Supervisor'
  | 'Guard'
  | 'Client_Contact';

/** Maps AuthRole → the closest DbRole for API compatibility */
export const AUTH_TO_DB_ROLE: Record<AuthRole, DbRole> = {
  guard: 'Guard',
  supervisor: 'Supervisor',
  ops: 'Ops_Manager',
  admin: 'Superadmin',
};

/** Maps DbRole → the closest AuthRole for UI/RBAC compatibility */
export const DB_TO_AUTH_ROLE: Record<DbRole, AuthRole> = {
  Guard: 'guard',
  Supervisor: 'supervisor',
  Ops_Manager: 'ops',
  Admin: 'admin',
  Superadmin: 'admin',
  Client_Contact: 'guard', // Client contacts get minimal guard-level read access
};

// ============================================================================
// 0. CORE ENTITIES (The Foundation)
// ============================================================================

/**
 * ⚠️ MOCK USER RECORDS — FOR DEVELOPMENT ONLY.
 * The password_hash field has been INTENTIONALLY REMOVED from this interface.
 * Passwords must NEVER exist in frontend code under any circumstance.
 */
export interface User {
  user_id: string;
  role: DbRole;
  email: string;
  /** @deprecated Never store passwords on the frontend. Backend-only field. */
  full_name: string;
  phone_number: string;
  created_at: string;
}

export interface PublicProfile {
  profile_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_public: boolean;
  created_at: string;
}

export interface Client {
  client_id: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
}

export interface ClientSite {
  site_id: string;
  client_id: string;
  site_name: string;
  address: string;
  gps_lat: number;
  gps_long: number;
}

/** UI-Specific Telemetry (IoT / Live Status Layer) */
export interface DeviceTelemetry {
  user_id: string;
  photo_url: string;
  status: 'on-duty' | 'patrol' | 'break' | 'off';
  battery: number;
  last_sync: string;
}

// ============================================================================
// PHASE 1: CRISIS-PROOFING & COMPLIANCE
// ============================================================================

export interface Document {
  doc_id: string;
  guard_id: string | null;
  client_id: string | null;
  doc_type: string;
  file_url: string;
  upload_date: string;
  expiry_date: string | null;
  status: 'Active' | 'Expired' | 'Revoked';
}

export interface SystemAlert {
  alert_id: string;
  user_id: string;
  doc_id: string;
  trigger_date: string;
  acknowledged: boolean;
}

export interface CrisisEvent {
  event_id: string;
  triggered_by: string;
  start_time: string;
  end_time: string | null;
  status: 'Active' | 'Resolved';
}

export interface CommsLog {
  log_id: string;
  recipient_id: string;
  message_type: 'Push' | 'SMS' | 'Viber';
  payload: string;
  delivery_status: 'Pending' | 'Sent' | 'Failed';
  timestamp: string;
}

/**
 * Offline sync queue entry.
 * payload_json uses Record<string, unknown> instead of 'any' for type safety.
 */
export interface OfflineSyncQueue {
  queue_id: string;
  device_id: string;
  action_type: 'Tour' | 'Incident' | 'DTR' | 'SOS';
  payload_json: Record<string, unknown>;
  sync_status: 'Pending' | 'Synced' | 'Failed';
  created_at: string;
  synced_at: string | null;
}

// ============================================================================
// PHASE 2: DIGITAL TRANSFORMATION
// ============================================================================

export interface Checkpoint {
  checkpoint_id: string;
  client_site_id: string;
  qr_nfc_code: string;
  required_time_window: string;
}

export interface TourLog {
  tour_id: string;
  guard_id: string;
  checkpoint_id: string;
  timestamp: string;
  gps_lat: number;
  gps_long: number;
  sync_status: string;
}

export interface Incident {
  incident_id: string;
  guard_id: string;
  site_id: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  media_urls: string[] | null;
  is_offline_origin: boolean;
  timestamp: string;
}

export interface GuardProfile {
  guard_id: string;
  pnp_license_no: string;
  pnp_expiry: string;
  nbi_status: 'PENDING' | 'CLEARED' | 'EXPIRED';
  medical_expiry: string;
  deployment_eligibility: boolean;
}

export interface DTR {
  dtr_id: string;
  guard_id: string;
  date: string;
  clock_in_time: string;
  clock_out_time: string | null;
  calculated_hours: number;
  overtime_hours: number;
}

export interface GamificationScore {
  guard_id: string;
  month: string;
  compliance_score: number;
  badges_earned: string[];
  digital_guardian_status: boolean;
}

export interface Mentorship {
  mentorship_id: string;
  champion_id: string;
  mentee_id: string;
  start_date: string;
  status: 'Active' | 'Inactive';
}

export interface HelpTicket {
  ticket_id: string;
  mentee_id: string;
  champion_id: string;
  issue_category: string;
  resolved: boolean;
  created_at: string;
}

export interface OnboardingWorkflow {
  workflow_id: string;
  client_id: string;
  guard_id: string;
  step_1_contract_uploaded: boolean;
  step_2_guard_briefed: boolean;
  step_3_site_risk_assessed: boolean;
  green_light_approved_by: string | null;
  approval_timestamp: string | null;
}

// ============================================================================
// PHASE 3: RESILIENT PRICING & TALENT
// ============================================================================

export interface Contract {
  contract_id: string;
  client_id: string;
  start_date: string;
  base_rate: number;
  has_inflation_clause: boolean;
  adjustment_percentage: number | null;
  next_review_date: string | null;
}

export interface BillingAdjustment {
  adjustment_id: string;
  contract_id: string;
  effective_date: string;
  old_rate: number;
  new_rate: number;
  applied_by: string;
}

export interface WelfareLog {
  log_id: string;
  guard_id: string;
  welfare_type: string;
  amount_value: number;
  date_issued: string;
  received_signature: string | null;
}

// ============================================================================
// PHASE 4: ZERO-LIABILITY MARKET CAPTURE
// ============================================================================

export interface ClientPortalUser {
  portal_user_id: string;
  client_id: string;
  email: string;
  /** @deprecated Backend-only. Never expose password hashes to the frontend. */
  access_level: 'View Only' | 'Download Reports';
}

export interface AutomatedReportSchedule {
  schedule_id: string;
  client_id: string;
  report_type: 'Daily' | 'Weekly' | 'Post-Crisis';
  delivery_time: string;
  last_sent_date: string | null;
}

export interface DRRMTag {
  tag_id: string;
  incident_id: string;
  tag_type: string;
  actions_taken: string;
}

export interface HybridIntegration {
  integration_id: string;
  client_id: string;
  vendor_name: string;
  api_key: string;
  webhook_url: string;
  status: 'Active' | 'Inactive';
}

export interface ExternalAlert {
  alert_id: string;
  integration_id: string;
  timestamp: string;
  alert_type: string;
  linked_guard_id: string | null;
  resolution_status: 'Open' | 'Investigating' | 'Resolved';
}

// ============================================================================
// MOCK DATA ARRAYS  (⚠️ Fictitious data for development only)
// ============================================================================

/**
 * Mock user records. NOTE: password_hash has been intentionally removed
 * from the type definition. No password data should ever exist on the frontend.
 */
export const users: User[] = [
  { user_id: 'U-001', role: 'Guard', email: 'rodel.mabini@strongholda3.com', full_name: 'Rodel Mabini', phone_number: '09171234567', created_at: '2024-01-10T08:00:00Z' },
  { user_id: 'U-002', role: 'Guard', email: 'jovencio.reyes@strongholda3.com', full_name: 'Jovencio Reyes', phone_number: '09171234568', created_at: '2024-02-15T08:00:00Z' },
  { user_id: 'U-003', role: 'Guard', email: 'arnel.tupas@strongholda3.com', full_name: 'Arnel Tupas', phone_number: '09171234569', created_at: '2024-03-01T08:00:00Z' },
  { user_id: 'U-004', role: 'Guard', email: 'wilfredo.cinco@strongholda3.com', full_name: 'Wilfredo Cinco', phone_number: '09171234570', created_at: '2024-03-10T08:00:00Z' },
  { user_id: 'U-005', role: 'Guard', email: 'ernesto.lagunoy@strongholda3.com', full_name: 'Ernesto Lagunoy', phone_number: '09171234571', created_at: '2024-04-05T08:00:00Z' },
  { user_id: 'U-100', role: 'Supervisor', email: 'supervisor.tacloban@strongholda3.com', full_name: 'Marco Valdez', phone_number: '09179876543', created_at: '2023-11-01T08:00:00Z' },
  { user_id: 'U-200', role: 'Ops_Manager', email: 'ops@strongholda3.com', full_name: 'Antonie M. Silva', phone_number: '09171350112', created_at: '2023-01-01T08:00:00Z' },
  { user_id: 'U-300', role: 'Superadmin', email: 'admin@stronghold-a3.com', full_name: 'System Superadmin', phone_number: '09171370112', created_at: '2023-01-01T08:00:00Z' },
  { user_id: 'U-400', role: 'Client_Contact', email: 'security@robinsons.com.ph', full_name: 'Robinsons Security Head', phone_number: '09181112222', created_at: '2024-01-15T08:00:00Z' },
];

export const publicProfiles: PublicProfile[] = [
  { profile_id: 'PP-001', user_id: 'U-001', display_name: 'Rodel Mabini', avatar_url: portraits[0], bio: 'Senior Security Guard with 10+ years of field experience.', is_public: true, created_at: '2024-01-10T08:00:00Z' },
  { profile_id: 'PP-002', user_id: 'U-200', display_name: 'Antonie M. Silva', avatar_url: portraits[1], bio: 'Operations Manager overseeing all Tacloban deployment sites.', is_public: true, created_at: '2023-01-01T08:00:00Z' },
  { profile_id: 'PP-003', user_id: 'U-300', display_name: 'System Superadmin', avatar_url: portraits[2], bio: 'Platform Administrator for Stronghold A3.', is_public: false, created_at: '2023-01-01T08:00:00Z' },
  { profile_id: 'PP-004', user_id: 'U-100', display_name: 'Marco Valdez', avatar_url: portraits[3], bio: 'Field Supervisor - Tacloban Zone.', is_public: true, created_at: '2023-11-01T08:00:00Z' },
];

export const clients: Client[] = [
  { client_id: 'C-001', company_name: 'Robinsons Land Corporation', contact_person: 'Marco Valdez', email: 'security@robinsons.com.ph', phone: '09181112222', address: 'Robinsons Place Tacloban, Leyte' },
  { client_id: 'C-002', company_name: 'Gaisano Capital', contact_person: 'Linda Go', email: 'admin@gaisano.com', phone: '09182223333', address: 'Gaisano Capital Tacloban, Leyte' },
  { client_id: 'C-003', company_name: 'EVRMC Hospital', contact_person: 'Dr. Santos', email: 'security@evrmc.gov.ph', phone: '09183334444', address: 'EVRMC, Tacloban City, Leyte' },
  { client_id: 'C-004', company_name: 'Leyte Park Resort', contact_person: 'Carlos Reyes', email: 'ops@leytepark.com', phone: '09184445555', address: 'Leyte Park Resort, Tacloban City, Leyte' },
];

export const clientSites: ClientSite[] = [
  { site_id: 'S-001', client_id: 'C-001', site_name: 'Robinsons Place Tacloban', address: 'Robinsons Place, Tacloban City', gps_lat: 11.244, gps_long: 125.003 },
  { site_id: 'S-002', client_id: 'C-002', site_name: 'Gaisano Capital', address: 'Gaisano Capital, Tacloban City', gps_lat: 11.241, gps_long: 125.001 },
  { site_id: 'S-003', client_id: 'C-003', site_name: 'EVRMC Hospital', address: 'EVRMC, Tacloban City', gps_lat: 11.250, gps_long: 125.005 },
  { site_id: 'S-004', client_id: 'C-004', site_name: 'Leyte Park Resort', address: 'Leyte Park Resort, Tacloban City', gps_lat: 11.238, gps_long: 125.010 },
];

export const deviceTelemetry: DeviceTelemetry[] = [
  { user_id: 'U-001', photo_url: portraits[0], status: 'on-duty', battery: 78, last_sync: '2 min ago' },
  { user_id: 'U-002', photo_url: portraits[1], status: 'patrol', battery: 14, last_sync: 'cached 18 min' },
  { user_id: 'U-003', photo_url: portraits[2], status: 'on-duty', battery: 92, last_sync: '1 min ago' },
  { user_id: 'U-004', photo_url: portraits[3], status: 'break', battery: 55, last_sync: '5 min ago' },
  { user_id: 'U-005', photo_url: portraits[0], status: 'patrol', battery: 33, last_sync: 'SMS fallback' },
];

// --- PHASE 1 DATA ---

export const documents: Document[] = [
  { doc_id: 'D-001', guard_id: null, client_id: null, doc_type: 'PNP-SOSIA', file_url: 'https://vault.strongholda3.com/enc/sosia.pdf', upload_date: '2025-11-01T08:00:00Z', expiry_date: '2026-11-01', status: 'Active' },
  { doc_id: 'D-002', guard_id: null, client_id: null, doc_type: 'LGU Permit', file_url: 'https://vault.strongholda3.com/enc/mayor_permit.pdf', upload_date: '2025-01-01T08:00:00Z', expiry_date: '2026-12-31', status: 'Active' },
  { doc_id: 'D-003', guard_id: null, client_id: null, doc_type: 'DOLE DO-174', file_url: 'https://vault.strongholda3.com/enc/dole_174.pdf', upload_date: '2025-02-14T08:00:00Z', expiry_date: '2027-02-14', status: 'Active' },
  { doc_id: 'D-004', guard_id: 'U-001', client_id: null, doc_type: 'PNP License', file_url: 'https://vault.strongholda3.com/enc/g_u001_pnp.pdf', upload_date: '2025-07-12T08:00:00Z', expiry_date: '2026-07-12', status: 'Active' },
  { doc_id: 'D-005', guard_id: 'U-002', client_id: null, doc_type: 'NBI Clearance', file_url: 'https://vault.strongholda3.com/enc/g_u002_nbi.pdf', upload_date: '2025-08-15T08:00:00Z', expiry_date: '2026-08-15', status: 'Active' },
];

export const systemAlerts: SystemAlert[] = [
  { alert_id: 'A-001', user_id: 'U-200', doc_id: 'D-004', trigger_date: '2026-06-12T08:00:00Z', acknowledged: false },
];

export const crisisEvents: CrisisEvent[] = [
  { event_id: 'CE-001', triggered_by: 'U-200', start_time: '2026-05-15T06:00:00Z', end_time: '2026-05-15T18:00:00Z', status: 'Resolved' },
];

export const commsLog: CommsLog[] = [
  { log_id: 'CL-001', recipient_id: 'U-100', message_type: 'SMS', payload: 'CRISIS MODE ACTIVATED: TYPHOON SIGNAL 2', delivery_status: 'Sent', timestamp: '2026-05-15T06:05:00Z' },
];

export const offlineSyncQueue: OfflineSyncQueue[] = [
  {
    queue_id: 'OSQ-001',
    device_id: 'DEV-U002',
    action_type: 'Incident',
    payload_json: { type: 'Suspicious Person' },
    sync_status: 'Synced',
    created_at: '2026-06-11T13:42:00Z',
    synced_at: '2026-06-11T13:45:00Z',
  },
];

// --- PHASE 2 DATA ---

export const guardProfiles: GuardProfile[] = [
  { guard_id: 'U-001', pnp_license_no: 'PNP-001', pnp_expiry: '2026-07-12', nbi_status: 'CLEARED', medical_expiry: '2027-01-10', deployment_eligibility: true },
  { guard_id: 'U-002', pnp_license_no: 'PNP-002', pnp_expiry: '2026-06-30', nbi_status: 'CLEARED', medical_expiry: '2026-08-15', deployment_eligibility: true },
  { guard_id: 'U-003', pnp_license_no: 'PNP-003', pnp_expiry: '2026-06-25', nbi_status: 'CLEARED', medical_expiry: '2027-01-20', deployment_eligibility: true },
  { guard_id: 'U-004', pnp_license_no: 'PNP-004', pnp_expiry: '2026-12-05', nbi_status: 'CLEARED', medical_expiry: '2026-07-02', deployment_eligibility: true },
  { guard_id: 'U-005', pnp_license_no: 'PNP-005', pnp_expiry: '2027-03-11', nbi_status: 'CLEARED', medical_expiry: '2026-10-30', deployment_eligibility: true },
];

export const checkpoints: Checkpoint[] = [
  { checkpoint_id: 'CP-001', client_site_id: 'S-001', qr_nfc_code: 'NFC-NW-01', required_time_window: 'Every 2 Hours' },
  { checkpoint_id: 'CP-002', client_site_id: 'S-001', qr_nfc_code: 'QR-PB2-01', required_time_window: 'Every 3 Hours' },
  { checkpoint_id: 'CP-003', client_site_id: 'S-001', qr_nfc_code: 'NFC-FE-01', required_time_window: 'Every 4 Hours' },
];

export const tourLogs: TourLog[] = [
  { tour_id: 'TL-001', guard_id: 'U-001', checkpoint_id: 'CP-001', timestamp: '2026-06-11T06:00:00Z', gps_lat: 11.244, gps_long: 125.003, sync_status: 'Synced' },
  { tour_id: 'TL-002', guard_id: 'U-001', checkpoint_id: 'CP-002', timestamp: '2026-06-11T07:00:00Z', gps_lat: 11.244, gps_long: 125.003, sync_status: 'Synced' },
];

export const incidentRecords: Incident[] = [
  { incident_id: 'INC-7781', guard_id: 'U-002', site_id: 'S-002', severity: 'Medium', description: 'Unidentified male loitering near loading bay. Endorsed to roving.', media_urls: null, is_offline_origin: false, timestamp: '2026-06-11T13:42:00Z' },
  { incident_id: 'INC-7780', guard_id: 'U-003', site_id: 'S-003', severity: 'Low', description: 'Assisted senior visitor to ER triage.', media_urls: ['https://vault.strongholda3.com/media/inc_7780_1.jpg'], is_offline_origin: false, timestamp: '2026-06-11T12:15:00Z' },
  { incident_id: 'INC-7779', guard_id: 'U-004', site_id: 'S-004', severity: 'High', description: 'Storm surge advisory raised. Perimeter sandbagged per DRRM protocol.', media_urls: ['https://vault.strongholda3.com/media/inc_7779_1.jpg', 'https://vault.strongholda3.com/media/inc_7779_2.jpg'], is_offline_origin: true, timestamp: '2026-06-11T11:03:00Z' },
];

export const dtr: DTR[] = [
  { dtr_id: 'DTR-001', guard_id: 'U-001', date: '2026-06-10', clock_in_time: '2026-06-10T06:00:00Z', clock_out_time: '2026-06-10T18:00:00Z', calculated_hours: 8, overtime_hours: 2 },
  { dtr_id: 'DTR-002', guard_id: 'U-002', date: '2026-06-10', clock_in_time: '2026-06-10T06:00:00Z', clock_out_time: '2026-06-10T18:00:00Z', calculated_hours: 8, overtime_hours: 1 },
];

export const gamificationScores: GamificationScore[] = [
  { guard_id: 'U-001', month: '2026-06-01', compliance_score: 98, badges_earned: ['Perfect_Attendance', 'Digital_Guardian'], digital_guardian_status: true },
  { guard_id: 'U-002', month: '2026-06-01', compliance_score: 85, badges_earned: ['Quick_Responder'], digital_guardian_status: false },
];

export const mentorships: Mentorship[] = [
  { mentorship_id: 'M-001', champion_id: 'U-001', mentee_id: 'U-004', start_date: '2026-05-01', status: 'Active' },
];

export const helpTickets: HelpTicket[] = [
  { ticket_id: 'HT-001', mentee_id: 'U-004', champion_id: 'U-001', issue_category: 'App Login Issue', resolved: true, created_at: '2026-06-05T09:00:00Z' },
];

export const onboardingWorkflows: OnboardingWorkflow[] = [
  { workflow_id: 'OW-001', client_id: 'C-001', guard_id: 'U-005', step_1_contract_uploaded: true, step_2_guard_briefed: true, step_3_site_risk_assessed: true, green_light_approved_by: 'U-200', approval_timestamp: '2026-04-05T10:00:00Z' },
];

// --- PHASE 3 DATA ---

export const contracts: Contract[] = [
  { contract_id: 'CON-001', client_id: 'C-001', start_date: '2025-01-01', base_rate: 500000, has_inflation_clause: true, adjustment_percentage: 5, next_review_date: '2027-01-01' },
  { contract_id: 'CON-002', client_id: 'C-002', start_date: '2025-06-01', base_rate: 250000, has_inflation_clause: true, adjustment_percentage: 5, next_review_date: '2026-06-01' },
];

export const billingAdjustments: BillingAdjustment[] = [
  { adjustment_id: 'BA-001', contract_id: 'CON-001', effective_date: '2026-01-01', old_rate: 500000, new_rate: 525000, applied_by: 'U-200' },
];

export const welfareLogs: WelfareLog[] = [
  { log_id: 'WL-001', guard_id: 'U-002', welfare_type: 'Typhoon Relief', amount_value: 2000, date_issued: '2026-05-16', received_signature: 'sig_hash_123' },
];

// --- PHASE 4 DATA ---

export const clientPortalUsers: ClientPortalUser[] = [
  { portal_user_id: 'CPU-001', client_id: 'C-001', email: 'security@robinsons.com.ph', access_level: 'Download Reports' },
];

export const automatedReportSchedules: AutomatedReportSchedule[] = [
  { schedule_id: 'ARS-001', client_id: 'C-001', report_type: 'Daily', delivery_time: '06:00:00', last_sent_date: '2026-06-11T06:00:00Z' },
];

export const drrmTags: DRRMTag[] = [
  { tag_id: 'DT-001', incident_id: 'INC-7779', tag_type: 'Flood Response', actions_taken: 'Perimeter sandbagged, evacuation route cleared.' },
];

export const hybridIntegrations: HybridIntegration[] = [
  { integration_id: 'HI-001', client_id: 'C-001', vendor_name: 'Tacloban CCTV Solutions', api_key: 'enc_key_123', webhook_url: 'https://webhook.cctv.tacloban/alerts', status: 'Active' },
];

export const externalAlerts: ExternalAlert[] = [
  { alert_id: 'EA-001', integration_id: 'HI-001', timestamp: '2026-06-11T14:00:00Z', alert_type: 'Motion Detected', linked_guard_id: 'U-001', resolution_status: 'Investigating' },
];

// ============================================================================
// LEGACY / UI-COMPAT FLATTENED EXPORTS
// (Denormalized views consumed by dashboard widgets)
// ============================================================================

/** Maps DB incident severity (TitleCase) → UI severity (lowercase) for display */
export const SEVERITY_TO_UI: Record<string, 'high' | 'medium' | 'low'> = {
  Critical: 'high',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

/** Reverse: UI severity → minimum DB severity it represents */
export const UI_TO_SEVERITY = {
  high: ['High', 'Critical'] as const,
  medium: ['Medium'] as const,
  low: ['Low'] as const,
};

export interface GuardView {
  id: string;
  name: string;
  rank: string;
  photo: string;
  status: 'on-duty' | 'patrol' | 'break' | 'off';
  battery: number;
  lat: number;
  lng: number;
  lastSync: string;
  site: string;
  licenseExpiry: string;
  nbiExpiry: string;
}

export const guards: GuardView[] = [
  { id: 'U-001', name: 'Rodel Mabini', rank: 'SG', photo: portraits[0], status: 'on-duty', battery: 78, lat: 11.244, lng: 125.003, lastSync: '2 min ago', site: 'Robinsons Place Tacloban', licenseExpiry: '2026-07-12', nbiExpiry: '2026-09-01' },
  { id: 'U-002', name: 'Jovencio Reyes', rank: 'SG', photo: portraits[1], status: 'patrol', battery: 14, lat: 11.241, lng: 125.001, lastSync: 'cached 18 min', site: 'Gaisano Capital', licenseExpiry: '2026-06-30', nbiExpiry: '2026-08-15' },
  { id: 'U-003', name: 'Arnel Tupas', rank: 'SG', photo: portraits[2], status: 'on-duty', battery: 92, lat: 11.250, lng: 125.005, lastSync: '1 min ago', site: 'EVRMC Hospital', licenseExpiry: '2026-06-25', nbiExpiry: '2027-01-20' },
  { id: 'U-004', name: 'Wilfredo Cinco', rank: 'SG', photo: portraits[3], status: 'break', battery: 55, lat: 11.238, lng: 125.010, lastSync: '5 min ago', site: 'Leyte Park Resort', licenseExpiry: '2026-12-05', nbiExpiry: '2026-07-02' },
  { id: 'U-005', name: 'Ernesto Lagunoy', rank: 'SO', photo: portraits[0], status: 'patrol', battery: 33, lat: 11.246, lng: 125.004, lastSync: 'SMS fallback', site: 'Robinsons Place Tacloban', licenseExpiry: '2027-03-11', nbiExpiry: '2026-10-30' },
];

export interface IncidentView {
  id: string;
  type: string;
  drrm: boolean;
  site: string;
  guard: string;
  time: string;
  summary: string;
  channel: 'cloud' | 'sms' | 'viber';
  severity: 'high' | 'medium' | 'low';
}

/**
 * Derives a UI incident view from the canonical Incident record.
 * Handles severity case mapping and time extraction.
 */
export function toIncidentView(src: Incident, guardName: string, channel: 'cloud' | 'sms' | 'viber' = 'cloud'): IncidentView {
  const uiSeverity = SEVERITY_TO_UI[src.severity] ?? 'low';
  const timePart = src.timestamp.split('T')[1]?.slice(0, 5) ?? '';
  return {
    id: src.incident_id,
    type: src.description.split('.')[0] || 'Unknown',
    drrm: src.severity === 'High' || src.severity === 'Critical',
    site: src.site_id,
    guard: guardName,
    time: timePart,
    summary: src.description,
    channel,
    severity: uiSeverity,
  };
}

export const incidents: IncidentView[] = [
  { id: 'INC-7781', type: 'Suspicious Person', drrm: false, site: 'Gaisano Capital', guard: 'Jovencio Reyes', time: '13:42', summary: 'Unidentified male loitering near loading bay. Endorsed to roving.', channel: 'cloud', severity: 'medium' },
  { id: 'INC-7780', type: 'Medical Assist', drrm: false, site: 'EVRMC Hospital', guard: 'Arnel Tupas', time: '12:15', summary: 'Assisted senior visitor to ER triage.', channel: 'viber', severity: 'low' },
  { id: 'INC-7779', type: 'Storm Surge', drrm: true, site: 'Leyte Park Resort', guard: 'Wilfredo Cinco', time: '11:03', summary: 'Storm surge advisory raised. Perimeter sandbagged per DRRM protocol.', channel: 'sms', severity: 'high' },
];

export interface VaultDoc {
  id: string;
  name: string;
  type: string;
  expiry: string;
}

export const vault: VaultDoc[] = [
  { id: 'V-001', name: 'PNP-SOSIA Agency License', type: 'Agency', expiry: '2026-11-01' },
  { id: 'V-002', name: 'LGU Mayor Permit', type: 'Permit', expiry: '2026-12-31' },
  { id: 'V-003', name: 'DOLE D.O. 174 Registration', type: 'Labor', expiry: '2027-02-14' },
  { id: 'V-004', name: 'BIR Certificate of Registration', type: 'Tax', expiry: '—' },
  { id: 'V-005', name: 'SSS / PhilHealth / Pag-IBIG R-1A', type: 'Statutory', expiry: '—' },
];

export interface PayrollRow {
  id: string;
  name: string;
  reg: number;
  ot: number;
  under: number;
  gross: number;
  sss: number;
  phic: number;
  pagibig: number;
  bir: number;
  net: number;
}

export const payroll: PayrollRow[] = [
  { id: 'U-001', name: 'Rodel Mabini', reg: 96, ot: 8, under: 0, gross: 18500, sss: 900, phic: 450, pagibig: 200, bir: 320, net: 16630 },
  { id: 'U-002', name: 'Jovencio Reyes', reg: 96, ot: 4, under: 2, gross: 17200, sss: 850, phic: 430, pagibig: 200, bir: 280, net: 15440 },
  { id: 'U-003', name: 'Arnel Tupas', reg: 96, ot: 12, under: 0, gross: 19400, sss: 950, phic: 470, pagibig: 200, bir: 360, net: 17420 },
  { id: 'U-004', name: 'Wilfredo Cinco', reg: 88, ot: 0, under: 8, gross: 15600, sss: 780, phic: 390, pagibig: 200, bir: 220, net: 14010 },
  { id: 'U-005', name: 'Ernesto Lagunoy', reg: 96, ot: 6, under: 0, gross: 18100, sss: 880, phic: 440, pagibig: 200, bir: 300, net: 16280 },
];

export interface PostOrder {
  id: string;
  title: string;
  time: string;
  site: string;
  done: boolean;
}

export const postOrders: PostOrder[] = [
  { id: 'PO-1', title: 'Scan QR — Main Gate', time: '06:00', site: 'Robinsons Place', done: true },
  { id: 'PO-2', title: 'NFC tap — Parking Bay 2', time: '08:00', site: 'Robinsons Place', done: true },
  { id: 'PO-3', title: 'Photo evidence — Fire Exit', time: '10:00', site: 'Robinsons Place', done: false },
  { id: 'PO-4', title: 'Scan QR — Loading Dock', time: '12:00', site: 'Robinsons Place', done: false },
  { id: 'PO-5', title: 'NFC tap — Rooftop Access', time: '14:00', site: 'Robinsons Place', done: false },
  { id: 'PO-6', title: 'Photo evidence — Perimeter Fence', time: '16:00', site: 'Robinsons Place', done: false },
];
