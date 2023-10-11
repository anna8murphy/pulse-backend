import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface LinkDoc extends BaseDoc {
  url: string;
  displayText: string;
  creator: ObjectId;
  postId: ObjectId;
  paywall?: Boolean;
}

export default class LinkConcept {
  public readonly links = new DocCollection<LinkDoc>("links");
  
    async create(creator: ObjectId, url: string, displayText: string,  postId: ObjectId, paywall: Boolean) {
      const _id = await this.links.createOne({ creator, url, displayText, postId, paywall });
      return { msg: "Link successfully created!", label: await this.links.readOne({ _id }) };
    }

    async read(creator: ObjectId, postId: ObjectId) {
      const links = (await this.links.readMany( { creator }));
      return { msg: "Here are your links!", links: links };
    }
    
    async delete(_id: ObjectId) {
      await this.links.deleteOne({ _id });
      return { msg: "Link deleted successfully!" };
    }
    
    async isCreator(user: ObjectId, _id: ObjectId) {
      const link = await this.links.readOne({ _id });
      if (!link) {
        throw new NotFoundError(`Label ${_id} does not exist!`);
      }
      if (link.creator.toString() !== user.toString()) {
        throw new LinkAuthorNotMatchError(user, _id);
      }
    }
  }
  
  export class LinkAuthorNotMatchError extends NotAllowedError {
    constructor(
      public readonly creator: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the creator of link {1}!", creator, _id);
    }
  }

  // Source: 6.1040 rec 4