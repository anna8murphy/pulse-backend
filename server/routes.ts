import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Friend, Group, Link, Note, Post, User, WebSession } from "./app";
import { PostDoc, PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {

  // USERS & SESSION
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  // POSTS
  @Router.get("/posts")
  async getPosts(session: WebSessionDoc, author?: string) {
    // Find all groups that current user is a member of
    const user = WebSession.getUser(session);
    const userGroups = await Group.getGroups({ 'members': { $in: [user] } });
    const groupIds = userGroups.map((group) => group._id);

    // Find all posts that are associated with those groups
    const posts = await Post.getPosts({ 'groups': { $in: groupIds } });
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:publishTo")
  async publishTo(post: ObjectId, publishTo: string) {
    const group = await Group.getGroupByName(publishTo);
    return await Post.publishTo(post, group._id);
  }
  
  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  // FRIENDS
  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  // NOTES
  @Router.get("/notes")
  async getNotes(session: WebSessionDoc, postId: ObjectId) {
    const user = WebSession.getUser(session);
    return await Note.read(user, postId);
  }

  @Router.post("/notes")
  async createNote(session: WebSessionDoc, label: string, postId: ObjectId) {
    const user = WebSession.getUser(session);
    return await Note.create(user, label, postId);
  }

  // LINKS
  @Router.post("/links")
  async createLink(session: WebSessionDoc, url: string, displayText: string, postId: ObjectId) {
    const user = WebSession.getUser(session);
    return await Link.create(user, url, displayText, postId);
  }

  @Router.get("/links")
  async getLinks(session: WebSessionDoc, postId: ObjectId) {
    const user = WebSession.getUser(session);
    return await Link.read(user, postId);
  }

  // GROUPS
  @Router.post("/groups")
  async createGroup(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await Group.create(user, name);
  }

  @Router.get("/groups")
  async getGroups(name?: string) {
    let groups;
    let group;
    if (name) {
      group = await Group.getGroupByName(name)
      return Responses.group(group);
    } else {
      groups = await Group.getGroups({});
      return Responses.groups(groups);
    }
  }

  @Router.patch("/groups/:changeTo")
  async editGroupName(session: WebSessionDoc, name: string, changeTo: string) {
    return await Group.editGroupName(name, changeTo);
  }

  @Router.delete("/groups")
  async deleteGroup(session: WebSessionDoc, name: string) {
    const toId = (await Group.getGroupByName(name))._id;
    return Group.delete(toId);
  }

  @Router.post("/groups/members/:addTo")
  async addMember(session: WebSessionDoc, addTo: string, member: string) {
    return await Group.addMember(addTo, member);
  }

  @Router.delete("/groups/members/:deleteFrom")
  async deleteMember(session: WebSessionDoc, deleteFrom: string, member: string) {
    return await Group.deleteMember(deleteFrom, member);
  }
}

export default getExpressRouter(new Routes());
