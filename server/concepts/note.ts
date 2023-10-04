import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface NoteDoc extends BaseDoc {
  note: string;
  creator: ObjectId;
  postId: ObjectId;
}

export default class NoteConcept {
  public readonly notes = new DocCollection<NoteDoc>("notes");
  
    async create(creator: ObjectId, note: string, postId: ObjectId) {
      const _id = await this.notes.createOne({ note, creator, postId });
      return { msg: "Note successfully created!", label: await this.notes.readOne({ _id }) };
    }

    async read(creator: ObjectId, postId: ObjectId) {
      const notes = (await this.notes.readMany( { creator, postId }));
      return { msg: "Here are your notes!", notes: notes };
    }
  
    async delete(_id: ObjectId) {
      await this.notes.deleteOne({ _id });
      return { msg: "Note deleted successfully!" };
    }
  
    async isCreator(user: ObjectId, _id: ObjectId) {
      const note = await this.notes.readOne({ _id });
      if (!note) {
        throw new NotFoundError(`Label ${_id} does not exist!`);
      }
      if (note.creator.toString() !== user.toString()) {
        throw new NoteAuthorNotMatchError(user, _id);
      }
    }
  }
  
  export class NoteAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly creator: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the creator of note {1}!", creator, _id);
    }
  }

  // Source: 6.1040 rec 4