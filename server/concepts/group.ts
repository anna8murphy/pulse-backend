import { User } from "../app";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

import { Filter, ObjectId } from "mongodb";

export interface GroupDoc extends BaseDoc {
  name: string;
  admin: ObjectId;
  members: Array<ObjectId>;
}

export interface MemberDoc extends BaseDoc {
  user: string;
}

export default class GroupConcept {
  public readonly groups = new DocCollection<GroupDoc>("groups");

  async create(admin: ObjectId, name: string){
    const members = new Array<ObjectId>;

    if (!name){
      throw new Error("Group name must be non-empty!");
    }
    const group = await this.groups.readOne({ name });
    if (group){
      throw new Error("A group with this name already exists!");
    }

    const _id = await this.groups.createOne({ admin, name, members });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  async getGroups(query: Filter<GroupDoc>){
    const groups = await this.groups.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    const memberLst = await Promise.all(groups.map(async (group) => {const members = await this.getMembers(group); return members;}));
    return { groups, memberLst };
  }

  async getGroupByName(name: string) {
    const group = await this.groups.readOne({ name });
    if (group === null) {
      throw new NotFoundError(`Group not found!`);
    }
    return group;
  }

  async delete(_id: ObjectId){
    const group = await this.groups.readOne({ _id });
    if (!group){
      throw new Error("A group with this name doesn't exist!");
    }
    await this.groups.deleteOne({ _id });
    return { msg: "Group deleted successfully!" };
  }

  // map member IDs to usernames
  async getMembers(group: GroupDoc){
    const members = await Promise.all(group.members.map(async (memberId) => { const memberUsername = await User.getUserById(memberId); return memberUsername; }));
    return members;
  }

  async addMember(addTo: string, member: string){
    const group = await this.getGroupByName(addTo);
    const memberId = await User.getUserByUsername(member);

    if (!group) throw new NotFoundError("Group not found!");
    if (group.members.some((memberObj) => memberObj.equals(memberId._id))) throw new Error("Member already exists in this group!");

    await this.groups.updateOneGroup({ _id: group._id }, { $push: { members: memberId._id } });
    return { msg: "Member added successfully!" };
  }

  async deleteMember(deleteFrom: string, member: string){
    const group = await this.getGroupByName(deleteFrom);
    const memberId = await User.getUserByUsername(member);
    
    if (!group) throw new NotFoundError("Group not found!");
    if (!group.members.some((memberIdObj) => memberIdObj.equals(memberId._id))) throw new Error("Member does not exist in this group!");

    await this.groups.updateOneGroup( { _id: group._id }, { $pull: { members: memberId._id } });
    return { msg: "Member deleted successfully!" };
      
    }
}