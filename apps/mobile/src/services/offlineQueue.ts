import * as SQLite from 'expo-sqlite';

let db: any = null;

function getDB() {
  if (!db) {
    try {
      // SDK 54+ API
      if (typeof SQLite.openDatabaseSync === 'function') {
        db = SQLite.openDatabaseSync('ecotrails.db');
      } else if (typeof (SQLite as any).openDatabase === 'function') {
        // Legacy API fallback
        db = (SQLite as any).openDatabase('ecotrails.db');
      } else {
        console.warn('expo-sqlite: No compatible database API found, using in-memory fallback');
        db = createInMemoryFallback();
      }
    } catch (error) {
      console.warn('expo-sqlite: Failed to open database, using in-memory fallback:', error);
      db = createInMemoryFallback();
    }
  }
  return db;
}

// In-memory fallback for when native SQLite is unavailable
function createInMemoryFallback() {
  const tables: Record<string, any[]> = {};
  return {
    runSync: (sql: string, params?: any[]) => {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (match && !tables[match[1]]) {
        tables[match[1]] = [];
      }
      const insertMatch = sql.match(/INSERT.*INTO (\w+)/i);
      if (insertMatch && tables[insertMatch[1]]) {
        tables[insertMatch[1]].push(params);
      }
    },
    getAllSync: (sql: string, _params?: any[]) => {
      const match = sql.match(/FROM (\w+)/i);
      if (match && tables[match[1]]) {
        return tables[match[1]];
      }
      return [];
    },
  };
}

export const initializeDB = () => {
  try {
    const database = getDB();
    if (typeof database.runSync === 'function') {
      // New synchronous API
      database.runSync(
        `CREATE TABLE IF NOT EXISTS hikes_queue (
          id TEXT PRIMARY KEY,
          trail_id TEXT,
          place_id TEXT NOT NULL,
          name TEXT,
          start_time TEXT NOT NULL,
          end_time TEXT,
          status TEXT NOT NULL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )`
      );
      database.runSync(
        `CREATE TABLE IF NOT EXISTS route_points_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hike_id TEXT NOT NULL,
          sequence INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          location TEXT NOT NULL,
          metadata TEXT,
          synced INTEGER DEFAULT 0,
          FOREIGN KEY (hike_id) REFERENCES hikes_queue(id)
        )`
      );
      database.runSync(
        `CREATE TABLE IF NOT EXISTS sensor_batches_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hike_id TEXT NOT NULL,
          batch_data TEXT NOT NULL,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (hike_id) REFERENCES hikes_queue(id)
        )`
      );
      database.runSync(
        `CREATE TABLE IF NOT EXISTS media_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hike_id TEXT NOT NULL,
          uri TEXT NOT NULL,
          type TEXT NOT NULL,
          metadata TEXT,
          synced INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (hike_id) REFERENCES hikes_queue(id)
        )`
      );
    } else if (typeof database.transaction === 'function') {
      // Legacy callback API
      database.transaction((tx: any) => {
        tx.executeSql(`CREATE TABLE IF NOT EXISTS hikes_queue (id TEXT PRIMARY KEY, trail_id TEXT, place_id TEXT NOT NULL, name TEXT, start_time TEXT NOT NULL, end_time TEXT, status TEXT NOT NULL, synced INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
        tx.executeSql(`CREATE TABLE IF NOT EXISTS route_points_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, hike_id TEXT NOT NULL, sequence INTEGER NOT NULL, timestamp TEXT NOT NULL, location TEXT NOT NULL, metadata TEXT, synced INTEGER DEFAULT 0, FOREIGN KEY (hike_id) REFERENCES hikes_queue(id))`);
        tx.executeSql(`CREATE TABLE IF NOT EXISTS sensor_batches_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, hike_id TEXT NOT NULL, batch_data TEXT NOT NULL, synced INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (hike_id) REFERENCES hikes_queue(id))`);
        tx.executeSql(`CREATE TABLE IF NOT EXISTS media_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, hike_id TEXT NOT NULL, uri TEXT NOT NULL, type TEXT NOT NULL, metadata TEXT, synced INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (hike_id) REFERENCES hikes_queue(id))`);
      });
    }
  } catch (error) {
    console.warn('Error initializing database (non-fatal):', error);
  }
};

function runQuery(sql: string, params?: any[]) {
  try {
    const database = getDB();
    if (typeof database.runSync === 'function') {
      database.runSync(sql, params);
    } else if (typeof database.transaction === 'function') {
      database.transaction((tx: any) => {
        tx.executeSql(sql, params);
      });
    }
  } catch (error) {
    console.warn('DB query error (non-fatal):', error);
  }
}

function queryAll(sql: string, params?: any[]): any[] {
  try {
    const database = getDB();
    if (typeof database.getAllSync === 'function') {
      return database.getAllSync(sql, params);
    } else if (typeof database.transaction === 'function') {
      return new Promise<any[]>((resolve) => {
        database.transaction((tx: any) => {
          tx.executeSql(sql, params, (_: any, { rows }: any) => {
            const items = [];
            for (let i = 0; i < rows.length; i++) items.push(rows.item(i));
            resolve(items);
          }, () => resolve([]));
        });
      }) as any;
    }
  } catch (error) {
    console.warn('DB query error (non-fatal):', error);
  }
  return [];
}

export const dbService = {
  addHikeToQueue: (hike: {
    hikeId: string;
    trailId: string | null;
    placeId: string;
    name: string | null;
    startTime: string;
    status: string;
  }) => {
    runQuery(
      `INSERT OR REPLACE INTO hikes_queue (id, trail_id, place_id, name, start_time, status, synced) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [hike.hikeId, hike.trailId, hike.placeId, hike.name, hike.startTime, hike.status]
    );
  },

  addRoutePoint: (hikeId: string, point: any) => {
    runQuery(
      `INSERT INTO route_points_queue (hike_id, sequence, timestamp, location, metadata) VALUES (?, ?, ?, ?, ?)`,
      [hikeId, point.sequence, point.timestamp.toISOString(), JSON.stringify(point.location), point.metadata ? JSON.stringify(point.metadata) : null]
    );
  },

  addSensorBatch: (hikeId: string, sensors: any[]) => {
    runQuery(
      `INSERT INTO sensor_batches_queue (hike_id, batch_data) VALUES (?, ?)`,
      [hikeId, JSON.stringify(sensors)]
    );
  },

  addMediaToQueue: (hikeId: string, uri: string, type: string, metadata?: any) => {
    runQuery(
      `INSERT INTO media_queue (hike_id, uri, type, metadata) VALUES (?, ?, ?, ?)`,
      [hikeId, uri, type, metadata ? JSON.stringify(metadata) : null]
    );
  },

  markHikeForSync: (hikeId: string) => {
    runQuery(`UPDATE hikes_queue SET status = 'completed', synced = 0 WHERE id = ?`, [hikeId]);
  },

  getPendingSyncs: (): any[] => {
    return queryAll(`SELECT * FROM hikes_queue WHERE synced = 0 ORDER BY created_at DESC`);
  },

  markSynced: (hikeId: string) => {
    runQuery(`UPDATE hikes_queue SET synced = 1 WHERE id = ?`, [hikeId]);
  },

  getPendingMedia: (): any[] => {
    return queryAll(`SELECT * FROM media_queue WHERE synced = 0 ORDER BY created_at ASC`);
  },

  markMediaSynced: (mediaId: number) => {
    runQuery(`UPDATE media_queue SET synced = 1 WHERE id = ?`, [mediaId]);
  },
};
