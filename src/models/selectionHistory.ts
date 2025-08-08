import mongoose, { Schema, Document } from 'mongoose';

export interface ISelectionHistory extends Document {
    meetingId: mongoose.Types.ObjectId;
    meetingName: string;
    department: string;
    participantId: mongoose.Types.ObjectId;
    participantName: string;
    selectedAt: Date;
}

const SelectionHistorySchema: Schema = new Schema({
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    meetingName: { type: String, required: true },
    department: { type: String, required: false },
    participantId: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    participantName: { type: String, required: true },
    selectedAt: { type: Date, default: Date.now }
});

export default mongoose.model<ISelectionHistory>('SelectionHistory', SelectionHistorySchema);
