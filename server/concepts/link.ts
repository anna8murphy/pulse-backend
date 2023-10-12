import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface LinkDoc extends BaseDoc {
  url: string;
  displayText: string;
  author: ObjectId;
  target: ObjectId;
  groups: Array<ObjectId>;
  paywall?: Boolean;
}

export default class LinkConcept {
  public readonly links = new DocCollection<LinkDoc>("links");
  
    async create(author: ObjectId, url: string, displayText: string,  target: ObjectId, paywall: Boolean) {
      const _id = await this.links.createOne({ author, url, displayText, target, paywall });
      return { msg: "Link successfully created!", label: await this.links.readOne({ _id }) };
    }

    async getByAuthor(author: ObjectId) { 
      const link = (await this.links.readMany( { author }));
      return { link };
    }

    async getByTarget(target: ObjectId) {
      const link = (await this.links.readOne( { target }));
      return { link };
    }
    
    async delete(linkId: ObjectId) {
      await this.links.deleteOne({ _id: linkId });
      return { msg: "Link deleted successfully!" };
    }

    async deleteByTarget(_id: ObjectId) {
      await this.links.deleteMany({ target: _id });
      return { msg: "Link deleted successfully!" };
    }
    
    async isAuthor(user: ObjectId, _id: ObjectId) {
      const link = await this.links.readOne({ _id });
      if (!link) {
        throw new NotFoundError(`Label ${_id} does not exist!`);
      }
      if (link.author.toString() !== user.toString()) {
        throw new LinkAuthorNotMatchError(user, _id);
      }
    }
  }
  
  export class LinkAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly author: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the author of link {1}!", author, _id);
    }
  }

  // Source: 6.1040 rec 4