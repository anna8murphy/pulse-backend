import FriendConcept from "./concepts/friend";
import GroupConcept from "./concepts/group";
import LinkConcept from "./concepts/link";
import NoteConcept from "./concepts/note";
import PostConcept from "./concepts/post";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Note = new NoteConcept();
export const Link = new LinkConcept();
export const Group = new GroupConcept();
