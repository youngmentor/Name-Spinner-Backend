import mongoose, { Schema, Document, Types } from 'mongoose';
import { IParticipant } from './participant';

export interface IMeeting extends Document {
    name: string;
    department: string;
    description?: string;
    isActive: boolean;
    participants: IParticipant[];
}

const MeetingSchema: Schema = new Schema({
    name: { type: String, required: true },
    department: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    participants: [{
        name: { type: String, required: true },
        role: { type: String },
        email: { type: String },
        department: { type: String, required: true },
        lastSelected: { type: Date },
        selectionCount: { type: Number, default: 0 }
    }]
}, { timestamps: true });

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);