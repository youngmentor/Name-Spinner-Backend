import mongoose from 'mongoose';
import migration001 from './001_add_enterprise_fields';
import migration002 from './002_migrate_selection_history';

/**
 * Migration Runner
 * Safely runs all migrations in order
 */

interface Migration {
    version: string;
    name: string;
    up: () => Promise<boolean>;
    down: () => Promise<boolean>;
}

const migrations: Migration[] = [
    {
        version: '001',
        name: 'Add Enterprise Fields',
        up: migration001.up,
        down: migration001.down
    },
    {
        version: '002',
        name: 'Migrate Selection History',
        up: migration002.up,
        down: migration002.down
    }
];

// Simple migration tracking (you could use a proper migrations collection)
const MigrationSchema = new mongoose.Schema({
    version: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    appliedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['completed', 'failed'], default: 'completed' }
});

const MigrationLog = mongoose.model('MigrationLog', MigrationSchema);

export class MigrationRunner {
    static async runMigrations() {
        console.log('🚀 Starting database migrations...');

        try {
            // Ensure migration log collection exists
            await MigrationLog.createCollection().catch(() => {
                // Collection might already exist
            });

            for (const migration of migrations) {
                const existingMigration = await MigrationLog.findOne({
                    version: migration.version
                });

                if (existingMigration && existingMigration.status === 'completed') {
                    console.log(`✅ Migration ${migration.version} (${migration.name}) already applied`);
                    continue;
                }

                console.log(`🔄 Running migration ${migration.version}: ${migration.name}...`);

                try {
                    const success = await migration.up();

                    if (success) {
                        await MigrationLog.findOneAndUpdate(
                            { version: migration.version },
                            {
                                version: migration.version,
                                name: migration.name,
                                appliedAt: new Date(),
                                status: 'completed'
                            },
                            { upsert: true }
                        );

                        console.log(`✅ Migration ${migration.version} completed successfully`);
                    } else {
                        throw new Error('Migration returned false');
                    }
                } catch (error) {
                    console.error(`❌ Migration ${migration.version} failed:`, error);

                    await MigrationLog.findOneAndUpdate(
                        { version: migration.version },
                        {
                            version: migration.version,
                            name: migration.name,
                            appliedAt: new Date(),
                            status: 'failed'
                        },
                        { upsert: true }
                    );

                    throw error;
                }
            }

            console.log('🎉 All migrations completed successfully');
            return true;
        } catch (error) {
            console.error('💥 Migration process failed:', error);
            throw error;
        }
    }

    static async rollbackMigration(version: string) {
        console.log(`🔄 Rolling back migration ${version}...`);

        try {
            const migration = migrations.find(m => m.version === version);
            if (!migration) {
                throw new Error(`Migration ${version} not found`);
            }

            const success = await migration.down();

            if (success) {
                await MigrationLog.deleteOne({ version });
                console.log(`✅ Migration ${version} rolled back successfully`);
            } else {
                throw new Error('Rollback returned false');
            }

            return true;
        } catch (error) {
            console.error(`❌ Rollback of migration ${version} failed:`, error);
            throw error;
        }
    }

    static async getMigrationStatus() {
        const appliedMigrations = await MigrationLog.find({}).sort({ version: 1 });

        console.log('\n📊 Migration Status:');
        console.log('═══════════════════');

        for (const migration of migrations) {
            const applied = appliedMigrations.find(m => m.version === migration.version);

            if (applied) {
                const status = applied.status === 'completed' ? '✅' : '❌';
                console.log(`${status} ${migration.version}: ${migration.name} (${applied.appliedAt.toISOString()})`);
            } else {
                console.log(`⏳ ${migration.version}: ${migration.name} (pending)`);
            }
        }

        console.log('═══════════════════\n');

        return appliedMigrations;
    }
}

export default MigrationRunner;
