import FriendConcept from "./concepts/friend";
import NoteConcept from "./concepts/note";
import LinkConcept from "./concepts/link";
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
