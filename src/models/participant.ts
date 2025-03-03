// models/Participant.ts
import { strict } from 'assert';
import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
    name: string;
    role?: string;
    email?: string;
    department: string;
    lastSelected?: Date;
    selectionCount: number;
}

const ParticipantSchema: Schema = new Schema({
    name: { type: String, required: true },
    role: { type: String },
    email: { type: String },
    department: { type: String, required: true },
    lastSelected: { type: Date },
    selectionCount: { type: Number, default: 0 }
},
    { timestamps: true, strict: false }
);

export default mongoose.model<IParticipant>('Participant', ParticipantSchema);