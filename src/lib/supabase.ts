import { createClient } from '@supabase/supabase-js';

const STORAGE_PREFIX = 'campus-mantri-offline-';
const OFFLINE_AUTH_STORAGE_KEY = 'campus-mantri-offline-auth-session';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const isRealSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

if (typeof window !== 'undefined') {
  console.log('Supabase runtime config:', {
    SUPABASE_URL,
    hasKey: Boolean(SUPABASE_KEY),
    keyLength: SUPABASE_KEY ? SUPABASE_KEY.length : 0
  });
}

type OfflineRow = Record<string, any>;
type SelectOptions = { count?: 'exact'; head?: boolean };
type RpcParams = Record<string, any>;

type OfflineTables = Record<string, OfflineRow[]>;

const DEFAULT_TABLES: OfflineTables = {
  auth_users: [],
  campus_mantris: [],
  admins: [
    {
      id: 'admin-1',
      username: 'shivam0754',
      name: 'Shivam Admin',
      email: 'shivam0754@campusmantri.local',
      password: 'Shivam@9589',
      is_super: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  admin_tasks: [
    {
      id: 'task-1',
      title: 'Participate in a GeeksforGeeks Contest',
      description: 'Submit a valid submission proof from your contest participation.',
      assigned_to: null,
      due_date: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
      priority: 'medium',
      points: 100,
      status: 'active',
      created_by_admin: true,
      created_at: new Date().toISOString(),
      is_archived: false
    },
    {
      id: 'task-2',
      title: 'Publish a Tech Blog Post',
      description: 'Share a link to a published blog article on your college profile.',
      assigned_to: null,
      due_date: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
      priority: 'low',
      points: 75,
      status: 'active',
      created_by_admin: true,
      created_at: new Date().toISOString(),
      is_archived: false
    }
  ],
  task_submissions: [],
  admin_announcements: [
    {
      id: 'announce-1',
      title: 'Offline Mode Active',
      message: 'This application is now running in offline mode. All data is stored locally in your browser.',
      priority: 'normal',
      is_active: true,
      created_at: new Date().toISOString(),
      is_archived: false
    }
  ],
  leaderboard: [],
  tasks: [],
  admin_logins: [],
  admin_approvals: []
};

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const getOfflineSession = () => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(OFFLINE_AUTH_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
};

const saveOfflineSession = (session: any) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(OFFLINE_AUTH_STORAGE_KEY, JSON.stringify(session));
};

const clearOfflineSession = () => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(OFFLINE_AUTH_STORAGE_KEY);
};

const offlineAuth = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const admin = readTable('admins').find(
      (row) => String(row.email).toLowerCase() === String(email).toLowerCase()
    );

    if (!admin || !admin.password || admin.password !== password) {
      return { data: null, error: { message: 'Invalid admin credentials' } };
    }

    const session = {
      access_token: 'offline-session-token',
      refresh_token: 'offline-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      provider_token: null,
      provider_refresh_token: null,
      token_type: 'bearer',
      user: {
        id: admin.id,
        email: admin.email,
        role: admin.is_super ? 'admin' : 'user'
      }
    };

    saveOfflineSession(session);
    return { data: { session, user: session.user }, error: null };
  },
  async getSession() {
    return { data: { session: getOfflineSession() }, error: null };
  },
  async signOut() {
    clearOfflineSession();
    return { data: null, error: null };
  },
  onAuthStateChange() {
    return { data: null, error: null };
  }
};

const readTable = (table: string): OfflineRow[] => {
  const storage = getStorage();
  if (!storage) return clone(DEFAULT_TABLES[table] || []);

  const storedValue = storage.getItem(`${STORAGE_PREFIX}${table}`);
  if (!storedValue) {
    const defaultRows = clone(DEFAULT_TABLES[table] || []);
    storage.setItem(`${STORAGE_PREFIX}${table}`, JSON.stringify(defaultRows));
    return defaultRows;
  }

  try {
    return JSON.parse(storedValue) as OfflineRow[];
  } catch {
    const defaultRows = clone(DEFAULT_TABLES[table] || []);
    storage.setItem(`${STORAGE_PREFIX}${table}`, JSON.stringify(defaultRows));
    return defaultRows;
  }
};

const writeTable = (table: string, rows: OfflineRow[]) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(`${STORAGE_PREFIX}${table}`, JSON.stringify(rows));
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
};

const getRelationKey = (row: OfflineRow, relation: string) => {
  const keyMap: Record<string, string[]> = {
    admin_tasks: ['admin_task_id', 'task_id', 'id'],
    campus_mantris: ['campus_mantri_id', 'mantri_id', 'user_id', 'id'],
    leaderboard: ['mantri_id', 'id'],
    admin_announcements: ['id'],
    admins: ['admin_id', 'id']
  };

  const candidates = keyMap[relation] || [relation + '_id', 'id'];
  return candidates.map((key) => row[key]).find((value) => value !== undefined && value !== null) ?? null;
};

const pickFields = (row: OfflineRow, fields: string[]) => {
  const picked: OfflineRow = {};
  fields.forEach((field) => {
    if (field === '*') {
      Object.assign(picked, clone(row));
    } else if (field in row) {
      picked[field] = row[field];
    }
  });
  return picked;
};

const parseSelect = (selectString: string, row: OfflineRow) => {
  const normalized = selectString.replace(/\s+/g, ' ').trim();
  const nestedMatches = Array.from(normalized.matchAll(/(\w+)\s*\(\s*([^)]*?)\s*\)/g));
  const baseFields = normalized
    .replace(/(\w+)\s*\([^)]*?\)/g, '')
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  const result: OfflineRow = {};
  const allFields = baseFields.includes('*');

  if (allFields || baseFields.length === 0) {
    Object.assign(result, clone(row));
  } else {
    Object.assign(result, pickFields(row, baseFields));
  }

  nestedMatches.forEach((match) => {
    const relation = match[1];
    const innerFields = match[2]
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);

    const key = getRelationKey(row, relation);
    const relatedRows = readTable(relation);
    const related = relatedRows.find((item) => String(item.id) === String(key)) || null;
    result[relation] = related ? pickFields(related, innerFields.includes('*') ? Object.keys(related) : innerFields) : null;
  });

  return result;
};

const parseOrExpression = (expression: string) => {
  return expression
    .split(',')
    .map((clause) => clause.trim())
    .map((clause) => {
      const match = clause.match(/^(\w+)\.(is|eq|neq|gt|lt)\.(.+)$/);
      if (!match) return null;
      const [, field, operator, value] = match;
      return { field, operator, value };
    })
    .filter(Boolean) as Array<{ field: string; operator: string; value: string }>;
};

const escapeSqlPattern = (pattern: string) => {
  return pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
};

const applyFilter = (rows: OfflineRow[], filter: any) => {
  switch (filter.type) {
    case 'eq':
      return rows.filter((row) => String(row[filter.field]) === String(filter.value));
    case 'gt':
      return rows.filter((row) => Number(row[filter.field]) > Number(filter.value));
    case 'ilike': {
      return rows.filter((row) => {
        const actual = row[filter.field];
        if (actual == null) return false;
        const pattern = String(filter.value).toLowerCase();
        const value = String(actual).toLowerCase();
        if (!pattern.includes('%') && !pattern.includes('_')) {
          return value === pattern;
        }
        const regex = new RegExp('^' + escapeSqlPattern(pattern).replace(/%/g, '[\\s\\S]*').replace(/_/g, '.') + '$', 'i');
        return regex.test(value);
      });
    }
    case 'in':
      return rows.filter((row) => Array.isArray(filter.value) && filter.value.map(String).includes(String(row[filter.field])));
    case 'or': {
      const expressions = parseOrExpression(filter.expression);
      return rows.filter((row) =>
        expressions.some((expr) => {
          const actual = row[expr.field];
          switch (expr.operator) {
            case 'is':
              return expr.value === 'null' ? actual == null : actual === expr.value;
            case 'eq':
              return String(actual) === expr.value;
            case 'neq':
              return String(actual) !== expr.value;
            case 'gt':
              return Number(actual) > Number(expr.value);
            case 'lt':
              return Number(actual) < Number(expr.value);
          }
          return false;
        })
      );
    }
    default:
      return rows;
  }
};

const applyOrdering = (rows: OfflineRow[], field: string, ascending: boolean) => {
  return [...rows].sort((a, b) => {
    const aValue = a[field];
    const bValue = b[field];
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return ascending ? aValue - bValue : bValue - aValue;
    }
    return ascending ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
  });
};

const applyRange = (rows: OfflineRow[], from?: number, to?: number) => {
  if (from === undefined || to === undefined) return rows;
  return rows.slice(from, to + 1);
};

const buildResult = (data: any, count: number | null = null, error: any = null) => ({ data, count, error, status: error ? 400 : 200, statusText: error ? 'error' : 'ok' });

class OfflineQuery {
  private table: string;
  private selectString = '*';
  private filters: any[] = [];
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;
  private orderField: string | null = null;
  private orderAscending = true;
  private countMode = false;
  private headMode = false;
  private singleMode: 'maybeSingle' | 'single' | null = null;
  private updatePayload: OfflineRow | null = null;
  private insertPayload: OfflineRow | OfflineRow[] | null = null;
  private deleteMode = false;
  private rpcName: string | null = null;
  private rpcParams: RpcParams = {};

  constructor(table: string) {
    this.table = table;
  }

  select(selectString = '*', options?: SelectOptions) {
    this.selectString = selectString;
    this.countMode = options?.count === 'exact';
    this.headMode = options?.head === true;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  gt(field: string, value: any) {
    this.filters.push({ type: 'gt', field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: 'in', field, value: values });
    return this;
  }

  ilike(field: string, value: any) {
    this.filters.push({ type: 'ilike', field, value });
    return this;
  }

  or(expression: string) {
    this.filters.push({ type: 'or', expression });
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  insert(payload: OfflineRow | OfflineRow[]) {
    this.insertPayload = payload;
    return this;
  }

  update(payload: OfflineRow) {
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  rpc(name: string, params: RpcParams = {}) {
    this.rpcName = name;
    this.rpcParams = params;
    return this;
  }

  private buildRows() {
    let rows = readTable(this.table);

    this.filters.forEach((filter) => {
      rows = applyFilter(rows, filter);
    });

    if (this.orderField) {
      rows = applyOrdering(rows, this.orderField, this.orderAscending);
    }

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = applyRange(rows, this.rangeFrom, this.rangeTo);
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    return rows;
  }

  private executeInsert() {
    const existing = readTable(this.table);
    const items = Array.isArray(this.insertPayload) ? this.insertPayload : [this.insertPayload];
    const rowsToInsert = items.map((item) => ({ id: item.id || generateId(), ...clone(item) }));
    const newRows = existing.concat(rowsToInsert);
    writeTable(this.table, newRows);
    return buildResult(rowsToInsert, rowsToInsert.length, null);
  }

  private executeUpdate() {
    const existing = readTable(this.table);
    const selected = this.buildRows();
    const selectedIds = new Set(selected.map((row) => row.id));
    const updatedRows = existing.map((row) => {
      if (selectedIds.has(row.id)) {
        return { ...clone(row), ...clone(this.updatePayload) };
      }
      return row;
    });
    writeTable(this.table, updatedRows);
    return buildResult(existing.filter((row) => selectedIds.has(row.id)).map((row) => ({ ...clone(row), ...clone(this.updatePayload) })), selected.length, null);
  }

  private executeDelete() {
    const existing = readTable(this.table);
    const selected = this.buildRows();
    const selectedIds = new Set(selected.map((row) => row.id));
    const remaining = existing.filter((row) => !selectedIds.has(row.id));
    writeTable(this.table, remaining);
    return buildResult(null, selected.length, null);
  }

  private executeSelect() {
    const rows = this.buildRows();
    const count = this.countMode ? rows.length : null;
    const data = rows.map((row) => parseSelect(this.selectString, row));

    if (this.headMode) {
      return buildResult([], count, null);
    }

    if (this.singleMode === 'single' || this.singleMode === 'maybeSingle') {
      return buildResult(data.length > 0 ? data[0] : null, count, null);
    }

    return buildResult(data, count, null);
  }

  private executeRpc() {
    const params = this.rpcParams || {};
    switch (this.rpcName) {
      case 'approve_submission': {
        const submissionId = params.submission_id;
        const pointValue = Number(params.points_value || 0);
        const submissions = readTable('task_submissions');
        const submission = submissions.find((item) => item.id === submissionId);
        if (!submission) {
          return buildResult(null, null, { message: 'Submission not found' });
        }
        submission.status = 'approved';
        submission.points_awarded = pointValue;
        submission.admin_feedback = 'Task approved successfully!';
        submission.approved_at = new Date().toISOString();
        writeTable('task_submissions', submissions);
        return buildResult({ ...clone(submission) }, 1, null);
      }
      case 'clear_all_completed_tasks': {
        const tasks = readTable('admin_tasks');
        const beforeCount = tasks.length;
        const remaining = tasks.filter((task) => task.status !== 'completed');
        writeTable('admin_tasks', remaining);
        return buildResult([{ cleared_count: beforeCount - remaining.length }], 1, null);
      }
      case 'clear_all_active_announcements': {
        const announcements = readTable('admin_announcements');
        const beforeCount = announcements.length;
        const remaining = announcements.filter((announcement) => announcement.is_active !== true);
        writeTable('admin_announcements', remaining);
        return buildResult([{ cleared_count: beforeCount - remaining.length }], 1, null);
      }
      case 'recompute_leaderboard': {
        const submissions = readTable('task_submissions');
        const approved = submissions.filter((item) => item.status === 'approved');
        const scoreboard: Record<string, { total_points: number; tasks_completed: number }> = {};
        approved.forEach((item) => {
          const entry = scoreboard[item.mantri_id] ?? { total_points: 0, tasks_completed: 0 };
          entry.total_points += Number(item.points_awarded || 0);
          entry.tasks_completed += 1;
          scoreboard[item.mantri_id] = entry;
        });
        const leaderboard = Object.entries(scoreboard)
          .map(([mantri_id, stats]) => ({
            id: `${mantri_id}-${generateId()}`,
            mantri_id,
            total_points: stats.total_points,
            tasks_completed: stats.tasks_completed,
            rank_position: 0,
            last_updated: new Date().toISOString()
          }))
          .sort((a, b) => b.total_points - a.total_points || b.tasks_completed - a.tasks_completed)
          .map((entry, index) => ({ ...entry, rank_position: index + 1 }));
        writeTable('leaderboard', leaderboard);
        return buildResult(leaderboard, leaderboard.length, null);
      }
      case 'execute_sql': {
        return buildResult(null, null, { message: 'Offline mode does not support execute_sql' });
      }
      default:
        return buildResult(null, null, { message: `RPC '${this.rpcName}' not supported in offline mode` });
    }
  }

  private async executeQuery() {
    if (this.rpcName) {
      return this.executeRpc();
    }

    if (this.insertPayload !== null) {
      return this.executeInsert();
    }

    if (this.updatePayload !== null) {
      return this.executeUpdate();
    }

    if (this.deleteMode) {
      return this.executeDelete();
    }

    return this.executeSelect();
  }

  public async run() {
    return this.executeQuery();
  }

  then(onFulfilled: any, onRejected?: any) {
    return this.run().then(onFulfilled, onRejected);
  }

  catch(onRejected: any) {
    return this.run().catch(onRejected);
  }
}

const createOfflineSupabaseClient = () =>
  new Proxy(
    {} as any,
    {
      get(_, method: string) {
        if (method === 'from') {
          return (table: string) => new OfflineQuery(table);
        }
        if (method === 'rpc') {
          return (name: string, params?: RpcParams) => new OfflineQuery('').rpc(name, params).run();
        }
        if (method === 'auth') {
          return offlineAuth;
        }
        return undefined;
      }
    }
  );

const realSupabase = isRealSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true
      }
    })
  : null;

const offlineSupabase = createOfflineSupabaseClient();

const isOfflineAdminActive = () => {
  const storage = getStorage();
  return storage?.getItem('isOfflineAdmin') === 'true';
};

const shouldUseOfflineSupabase = () => {
  return !realSupabase;
};

export const supabase = new Proxy(
  {} as any,
  {
    get(_, method: string | symbol) {
      if (shouldUseOfflineSupabase()) {
        return (offlineSupabase as any)[method as keyof typeof offlineSupabase];
      }
      return realSupabase ? (realSupabase as any)[method as keyof typeof realSupabase] : undefined;
    },
    set(_, method: string | symbol, value: any) {
      if (shouldUseOfflineSupabase()) {
        (offlineSupabase as any)[method as keyof typeof offlineSupabase] = value;
        return true;
      }
      if (realSupabase) {
        (realSupabase as any)[method as keyof typeof realSupabase] = value;
        return true;
      }
      return false;
    }
  }
) as any;

export type SupabaseConnectionResult = {
  connected: boolean;
  error?: string;
};

export const testSupabaseConnection = async (): Promise<SupabaseConnectionResult> => {
  if (!realSupabase) {
    return { connected: false, error: 'Supabase environment variables are not configured.' };
  }

  try {
    const { error } = await realSupabase
      .from('campus_mantris')
      .select('id')
      .limit(1);

    if (error) {
      return { connected: false, error: error.message || 'Supabase query failed' };
    }

    return { connected: true };
  } catch (error) {
    return { connected: false, error: error instanceof Error ? error.message : String(error) };
  }
};

export const isSupabaseAvailable = () => Boolean(realSupabase);
export const isSupabaseConfigured = isRealSupabaseConfigured;

export type CampusMantri = {
  id: string;
  name: string;
  email: string;
  phone: string;
  college_name: string;
  gfg_mantri_id: string;
  status: 'active' | 'inactive' | 'suspended';
  joined_date: string;
  created_at: string;
  user_id?: string;
  total_points?: number;
  approved_tasks?: number;
};

export type Admin = {
  id: string;
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  password_hash?: string;
  is_super?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  assigned_to: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  campus_mantris?: CampusMantri;
};

export type AdminTask = {
  id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date: string;
  priority: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5' | 'level_6' | 'low' | 'medium' | 'high' | 'urgent';
  points?: number;
  status: 'active' | 'completed' | 'cancelled';
  created_by_admin: boolean;
  created_at: string;
  is_archived?: boolean;
};

export type TaskSubmission = {
  id: string;
  admin_task_id: string;
  mantri_id: string;
  submission_text: string;
  submission_date: string;
  status: 'submitted' | 'approved' | 'rejected' | 'needs_revision';
  admin_feedback?: string;
  points_awarded: number;
  submitted_at: string;
  proof_url?: string;
  proof_type?: string;
  admin_tasks?: AdminTask;
  campus_mantris?: CampusMantri;
};

export type LeaderboardEntry = {
  id: string;
  mantri_id: string;
  total_points: number;
  tasks_completed: number;
  rank_position: number;
  last_updated: string;
  campus_mantris?: CampusMantri;
};

export type AdminAnnouncement = {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_active: boolean;
  created_at: string;
  is_archived?: boolean;
};

export type PerformanceMetrics = {
  id: string;
  mantri_id: string;
  month: string;
  tasks_completed: number;
  tasks_assigned: number;
  performance_score: number;
  created_at: string;
};

export const safeSupabaseOperation = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Database operation failed' }
    };
  }
};
