import { User } from "../app";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

import { Filter, ObjectId } from "mongodb";

export interface GroupDoc extends BaseDoc {
  name: string;
  admin: ObjectId;
  members: Array<ObjectId>;
}

export default class GroupConcept {
  public readonly groups = new DocCollection<GroupDoc>("groups");

  async create(admin: ObjectId, name: string){
    const members = [admin];
    if (!name) throw new GroupNameEmptyError();
    
    const group = await this.groups.readOne({ name });
    if (group) throw new DuplicateGroupNameError(name);
  
    const _id = await this.groups.createOne({ admin, name, members });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  async isAdmin(user: ObjectId, groupName: string) {
    const _id = (await this.getGroupByName(groupName))._id;
    const group = await this.groups.readOne({ _id });
    if (!group) {
      throw new NotFoundError(`Group ${_id} does not exist!`);
    }
    if (group.admin.toString() !== user.toString()) {
      const groupName = await this.idsToGroupNames([group._id]);
      throw new NonexistentGroupError(groupName[0]!);
    }
  }

  async getGroups(query: Filter<GroupDoc>){
    const groups = await this.groups.readMany(query, { sort: { dateUpdated: -1 } });
    return groups;
  }

  async getGroupByName(name: string, admin?: ObjectId) {
    const group = await this.groups.readOne({ name });
    if (group === null) throw new NonexistentGroupError(name);
    if (admin) await this.isAdmin(admin, name);
    return group;
  }

  async delete(_id: ObjectId){
    const group = await this.groups.readOne({ _id });
    if (!group) throw new NonexistentGroupError(_id.toString());
  
    await this.groups.deleteOne({ _id });
    return { msg: "Group deleted successfully!" };
  }

  async addMember(addTo: string, member: string){
    const group = await this.getGroupByName(addTo);
    if (!group) throw new NonexistentGroupError(addTo);

    const memberId = await User.getUserByUsername(member);
    if (group.members.some((memberObj) => memberObj.equals(memberId._id))) throw new DuplicateMemberError(member, addTo);

    await this.groups.filterUpdateOne({ _id: group._id }, { $push: { members: memberId._id } });    
    return { msg: "Member added successfully!" };
  }

  async deleteMember(deleteFrom: string, member: string){
    const group = await this.getGroupByName(deleteFrom);
    if (!group) throw new NonexistentGroupError(deleteFrom);
    
    const memberId = await User.getUserByUsername(member);
    if (!group.members.some((memberIdObj) => memberIdObj.equals(memberId._id))) throw new NonexistentMemberError(member);

    await this.groups.filterUpdateOne( { _id: group._id }, { $pull: { members: memberId._id } });
    return { msg: "Member deleted successfully!" };
    }

  async editGroupName(name: string, changeTo: string){
    if (!name || !changeTo) throw new GroupNameEmptyError();

    const group = await this.getGroupByName(name);
    if (!group) throw new NonexistentGroupError(name);
    
    await this.groups.updateOne( { _id: group._id }, { name: changeTo} );
    return { msg: `Group name changed from '${name}' to '${changeTo}'!` };
  }

  async idsToGroupNames(ids: ObjectId[]) {
    const groups = await this.groups.readMany({ _id: { $in: ids } });
    const idToGroup = new Map(groups.map((group) => [group._id.toString(), group]));
    const groupNames = ids
      .filter((id) => idToGroup.has(id.toString()))
      .map((id) => idToGroup.get(id.toString())?.name);
    return groupNames;
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

export class GroupNameEmptyError extends NotAllowedError {
  constructor() {
    super("Group name must be non-empty!");
  }
}

export class DuplicateGroupNameError extends NotAllowedError {
  constructor(
    public readonly name: string,
  ) {
    super("A group named '{0}' already exists!", name);
  }
}

export class DuplicateMemberError extends NotAllowedError {
  constructor(
    public readonly member: string,
    public readonly group: string
  ) {
    super("{0} is already in {1}!", member, group);
  }
}

export class NonexistentMemberError extends NotAllowedError {
  constructor(
    public readonly member: string,
  ) {
    super("A member named '{0}' does not exist!", member);
  }
}

export class NonexistentGroupError extends NotAllowedError {
  constructor(
    public readonly name: string,
  ) {
    super("A group named '{0}' does not exist!", name);
  }
}


