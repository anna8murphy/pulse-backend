import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Group, Link, Note, Post, User, WebSession } from "./app";
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
    const user = WebSession.getUser(session);
    const userGroups = await Group.getGroups({ 'members': { $in: [user] } });
    const groupIds = userGroups.map(group => group._id);
  
    let authorId;
    if (author) {
      authorId = (await User.getUserByUsername(author))._id;
    }
  
    const query = author
      ? { $and: [{ 'groups': { $in: groupIds } }, { 'author': authorId }] }
      : { $or: [{ 'groups': { $in: groupIds } }, { 'author': user }] };
  
    const posts = await Post.getPosts(query);
    return Responses.posts(posts);
  }
  
  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, url: string, displayUrlAs: string, paywall: string, groups: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, groups, options);
    const postId = ((created!).post!)._id;

    let paywallBool = false;
    if (paywall == "Y") paywallBool = true;
    await Link.create(user, url, displayUrlAs, postId, paywallBool);
    return { msg: created.msg };
  }

  @Router.patch("/posts/:publishTo")
  async publishTo(session: WebSessionDoc, post: ObjectId, publishTo: string) {
    const admin = WebSession.getUser(session);
    const groupId = (await Group.getGroupByName(publishTo))._id;
    await Group.isAdmin(admin, publishTo);
    return await Post.publishTo(post, groupId);
  }
  
  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId, group: string) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    if (group){
      const groupId = (await Group.getGroupByName(group))._id;
      await Group.isAdmin(user, group);
      return Post.removeGroup(_id, groupId);
    }
    // delete from all groups
    await Link.deleteByTarget(_id);
    await Note.deleteByTarget(_id);
    return Post.delete(_id);
  }

  // NOTES
  @Router.post("/notes")
  async createNote(session: WebSessionDoc, note: string, targetPost: ObjectId) {
    const author = WebSession.getUser(session);
    await Post.isAuthor(author, targetPost); // only post author can add a note
    await Post.checkPostExists(targetPost);
    return await Note.create(author, note, targetPost);
  }

  @Router.delete("/notes")
  async deleteNote(session: WebSessionDoc, noteId: ObjectId) {
    const author = WebSession.getUser(session);
    await Note.isAuthor(author, noteId);
    return await Note.delete(noteId);
  }

  @Router.patch("/notes/:_id")
  async updateNote(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const author = WebSession.getUser(session);
    await Note.isAuthor(author, _id);
    return await Note.update(_id, update);
  }

  // LINKS
  @Router.get("/links")
  async getLinks(session: WebSessionDoc, post: ObjectId) {
    const user = WebSession.getUser(session);
    const userGroups = await Group.getGroups({ 'members': { $in: [user] } });
    const groupIds = userGroups.map(group => group._id);
    const posts = await Post.getPosts({
      $or: [
        { 'groups': { $in: groupIds } },
        { 'author': user }
      ]
    });
    const links = await Promise.all(posts.map(post => Link.getByTarget(post._id)));
    return links;
  }

  // GROUPS
  @Router.post("/groups")
  async createGroup(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await Group.create(user, name);
  }

  @Router.get("/groups")
  async getGroups(session: WebSessionDoc, name?: string) {
    const user = WebSession.getUser(session);
    let groups;
    if (name) {
      groups = await Group.getGroups({ name: name, admin: user });
      return Responses.group(groups[0]);
    } else {
      groups = await Group.getGroups({ admin: user });
      return Responses.groups(groups);
    }
  }

  @Router.patch("/groups")
  async editGroupName(session: WebSessionDoc, name: string, changeTo: string) {
    const user = WebSession.getUser(session);
    await Group.isAdmin(user, name);
    return await Group.editGroupName(name, changeTo);
  }

  @Router.delete("/groups")
  async deleteGroup(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    await Group.isAdmin(user, name);
    const toId = (await Group.getGroupByName(name))._id;
    return Group.delete(toId);
  }

  @Router.post("/groups/members/:addTo")
  async addMember(session: WebSessionDoc, addTo: string, member: string) {
    const user = WebSession.getUser(session);
    await Group.isAdmin(user, addTo);
    return await Group.addMember(addTo, member);
  }

  @Router.delete("/groups/members/:deleteFrom")
  async deleteMember(session: WebSessionDoc, deleteFrom: string, member: string) {
    const user = WebSession.getUser(session);
    await Group.isAdmin(user,deleteFrom );
    return await Group.deleteMember(deleteFrom, member);
  }
}

export default getExpressRouter(new Routes());
