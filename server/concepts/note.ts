import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface NoteDoc extends BaseDoc {
  note: string;
  author: ObjectId;
  target: ObjectId;
}

export default class NoteConcept {
  public readonly notes = new DocCollection<NoteDoc>("notes");
  
    async create(author: ObjectId, note: string, target: ObjectId) {
      const notes = (await this.notes.readMany( { target: target }));
      if (notes.length > 0) throw new DuplicateNoteError();

      const _id = await this.notes.createOne({ note: note, author: author, target: target });
      return { msg: "Note successfully created!", label: await this.notes.readOne({ _id }) };
    }

    async getByAuthor(author: ObjectId) {
      const notes = (await this.notes.readMany( { author }));
      return { msg: "Here are your notes!", notes: notes };
    }

    async getByTarget(target: ObjectId) { 
      const notes = (await this.notes.readMany( { target }));
      return { msg: "Here are your notes!", notes: notes };
    }
  
    async delete(_id: ObjectId) {
      await this.notes.deleteOne({ _id: _id });
      return { msg: "Note deleted successfully!" };
    }

    async deleteByTarget(_id: ObjectId) {
      await this.notes.deleteMany({ target: _id });
      return { msg: "Note deleted successfully!" };
    }

    async update(_id: ObjectId, update: Partial<NoteDoc>) {
      await this.notes.updateOne({ _id }, update);
      return { msg: "Note successfully updated!" };
    }
  
    async isAuthor(user: ObjectId, _id: ObjectId) {
      const note = await this.notes.readOne({ _id });
      if (!note) {
        throw new NotFoundError(`Label ${_id} does not exist!`);
      }
      if (note.author.toString() !== user.toString()) {
        throw new NoteAuthorNotMatchError(user, _id);
      }
    }
  }
  
  export class NoteAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the author of note {1}!", author, _id);
    }
  }

  export class DuplicateNoteError extends NotAllowedError {
    constructor() {
      super("A note on this post already exists!");
    }
  }

  // Source: 6.1040 rec 4