import { Group, Link, User } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friend";
import { GroupDoc } from "./concepts/group";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await User.getUserById(post.author);
    return { ...post, author: author.username};
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authorIds = posts.map((post) => post.author);
    const authors = await User.idsToUsernames(authorIds);

    const groupNamesPromises = posts.map(async (post) => {
      const groupIds = post.groups || [];
      const groupNames = await Group.idsToGroupNames(groupIds);
      return groupNames;
    });
    const groups = await Promise.all(groupNamesPromises);

    const linksPromises = posts.map((post) => Link.getByTarget(post._id));
    const links = await Promise.all(linksPromises);

    const postsWithLinks = posts.map((post, i) => ({
      ...post,
      link: links[i],
      author: authors[i],
      groups: groups[i]
    }));

    return postsWithLinks;
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await User.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }

  /**
   * Convert GroupDoc into more readable format for the frontend by converting the creator and members id into a username.
   */
  static async group(group: GroupDoc | null) {
    if (!group) {
      return group;
    }
    const admin = await User.getUserById(group.admin);
    const members = await User.idsToUsernames(group.members);
    return { ...group, admin: admin.username, members: members };
  }

  /**
   * Same as {@link group} but for an array of GroupDoc for improved performance.
   */
  static async groups(groups: GroupDoc[]) {
    const admins = await User.idsToUsernames(groups.map((group) => group.admin));
    const members = await Promise.all(groups.map(async (group) => await User.idsToUsernames(group.members)));
    return groups.map((group, i) => ({ ...group, admin: admins[i], members: members[i] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await User.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});
