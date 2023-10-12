import { Filter, ObjectId } from "mongodb";
import { Group } from "../app";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  groups: Array<ObjectId>; 
  options?: PostOptions;
}

export default class PostConcept {
  public readonly posts = new DocCollection<PostDoc>("posts");

  async create(author: ObjectId, content: string, group: string, options?: PostOptions) {
    let addTo: ObjectId[];
    if (!group) { // add to all groups
      const groups = Group.getGroups({'admin': author});
      addTo = (await groups).map((group) => group._id);
    } 
    else {
      const groupObj = await Group.getGroupByName(group, author);
      if (!groupObj) throw new NonexistentGroupError([group]);
      addTo = [groupObj._id];
    }
    const _id = await this.posts.createOne({ author, content, options, groups: addTo });
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async publishTo(admin: ObjectId, post: ObjectId, group: ObjectId){
    const groupName = await Group.idsToGroupNames([group]);

    const allPosts = await this.posts.readMany( {_id: post} );
    if (allPosts.length === 0) throw new NonexistentPostError();

    const groupedPosts = await this.posts.readMany( { groups: {$in: [group]}, _id: post} );
    if (groupedPosts.length > 0) throw new PostAlreadyPublished(groupName);

    await this.posts.filterUpdateOne({ _id: post }, { $push: { groups: group } });
    return { msg: `Post published to ${groupName}!` };
  }

  async removeGroup(post: ObjectId, group: ObjectId){
    const groups = await this.posts.readMany({ _id: post, 'groups': { $in: [group]} });
    const allGroups = await this.posts.readMany({'groups': { $in: [group]} });
    const groupName = await Group.idsToGroupNames([group]);

    if (allGroups.length === 0) throw new NonexistentGroupError(groupName);
    if (groups.length === 0) throw new PostNotPublished(groupName);

    await this.posts.filterUpdateOne({ _id: post }, { $pull: { groups: group } });
    return { msg: `Post removed from ${groupName}!` };
  }
  
  async getPosts(query: Filter<PostDoc>) {
    const posts = await this.posts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async checkPostExists(post: ObjectId){
    const allPosts = await this.posts.readMany( {_id: post} );
    if (allPosts.length === 0) throw new NonexistentPostError();
  }

  async getByAuthor(author: ObjectId) {
    return await this.getPosts({ author });
  }

  async update(_id: ObjectId, update: Partial<PostDoc>) {
    this.sanitizeUpdate(update);
    await this.posts.updateOne({ _id }, update);
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  private sanitizeUpdate(update: Partial<PostDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["content", "options"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}

export class PostAlreadyPublished extends NotAllowedError {
  constructor(
    public readonly groupName: string[],
  ) {
    super("Post is already published to {0}!", groupName[0]);
  }
}

export class PostNotPublished extends NotAllowedError {
  constructor(
    public readonly groupName: string[],
  ) {
    super("Post is not published to {0}!", groupName[0]);
  }
}

export class NonexistentGroupError extends NotAllowedError {
  constructor(
    public readonly groupName: string[],
  ) {
    super("A group with this name does not exist!", groupName[0]);
  }
}

export class NonexistentPostError extends NotAllowedError {
  constructor(
  ) {
    super("A post with this ID does not exist!");
  }
}