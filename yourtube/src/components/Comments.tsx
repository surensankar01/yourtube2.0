import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Languages } from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes: string[];
  dislikes: string[];
  city?: string;
}

// ─── Supported translation languages ─────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
];

// Blocks < > { } [ ] \ | (injection-risk characters)
const SPECIAL_CHAR_REGEX = /[<>{}\[\]\\|]/;

// ─── Component ────────────────────────────────────────────────────────────────

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user, userRegion } = useUser();
  const [loading, setLoading] = useState(true);

  // Translation state
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [openTranslateMenu, setOpenTranslateMenu] = useState<string | null>(null);

  // ── W-04 fix: derive city from AuthContext userRegion instead of a
  //    second fetch to ipapi.co. AuthContext already fetches and caches
  //    the same data in sessionStorage.
  const city = userRegion?.city || "";

  // ─── Load comments ────────────────────────────────────────────────────────

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      const data: Comment[] = (res.data || []).map((c: any) => ({
        ...c,
        likes: c.likes || [],
        dislikes: c.dislikes || [],
        city: c.city || "",
      }));
      setComments(data);
    } catch (error) {
      console.error("loadComments error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit new comment ───────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    if (SPECIAL_CHAR_REGEX.test(newComment)) {
      toast.error('Comments cannot contain: < > { } [ ] \\ |');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        city: city,
      });

      if (res.data.comment) {
        const optimistic: Comment = {
          _id: Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          commentedon: new Date().toISOString(),
          likes: [],
          dislikes: [],
          city: city,
        };
        setComments((prev) => [optimistic, ...prev]);
        setNewComment("");
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error posting comment.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Like ─────────────────────────────────────────────────────────────────

  const handleLike = async (commentId: string) => {
    if (!user) { toast.error("Sign in to like comments"); return; }
    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, {
        userId: user._id,
      });
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId
            ? { ...c, likes: res.data.likes || [], dislikes: res.data.dislikes || [] }
            : c
        )
      );
    } catch {
      toast.error("Could not update like.");
    }
  };

  // ─── Dislike (auto-delete at 2) ───────────────────────────────────────────

  const handleDislike = async (commentId: string) => {
    if (!user) { toast.error("Sign in to dislike comments"); return; }
    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, {
        userId: user._id,
      });
      if (res.data.deleted) {
        setComments((prev) => prev.filter((c) => c._id !== commentId));
        toast.info("Comment removed — it received 2 dislikes.");
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? { ...c, likes: res.data.likes || [], dislikes: res.data.dislikes || [] }
              : c
          )
        );
      }
    } catch {
      toast.error("Could not update dislike.");
    }
  };

  // ─── Translate ────────────────────────────────────────────────────────────

  const handleTranslate = async (commentId: string, text: string, targetLang: string) => {
    setTranslatingId(commentId);
    setOpenTranslateMenu(null);
    try {
      const res = await axiosInstance.post("/comment/translate", { text, targetLang });
      setTranslatedTexts((prev) => ({ ...prev, [commentId]: res.data.translated }));
    } catch {
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslatingId(null);
    }
  };

  const clearTranslation = (commentId: string) => {
    setTranslatedTexts((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
  };

  // ─── Edit / Delete ────────────────────────────────────────────────────────

  const handleEdit = (c: Comment) => {
    setEditingCommentId(c._id);
    setEditText(c.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    if (SPECIAL_CHAR_REGEX.test(editText)) {
      toast.error('Comments cannot contain: < > { } [ ] \\ |');
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/editcomment/${editingCommentId}`, {
        commentbody: editText,
      });
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch {
      toast.error("Failed to update comment.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch {
      toast.error("Failed to delete comment.");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-sm text-gray-400 animate-pulse">Loading comments…</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {/* ── New comment form ─────────────────────────────────────────────── */}
      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment…"
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            {/* Inline warning */}
            {SPECIAL_CHAR_REGEX.test(newComment) && (
              <p className="text-xs text-red-500">
                Special characters {'< > { } [ ] \\ |'} are not allowed.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={
                  !newComment.trim() ||
                  isSubmitting ||
                  SPECIAL_CHAR_REGEX.test(newComment)
                }
              >
                {isSubmitting ? "Posting…" : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Comments list ─────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No comments yet. Be the first!</p>
        ) : (
          comments.map((c) => {
            const userLiked =
              !!user && c.likes.some((lid) => lid.toString() === user._id);
            const userDisliked =
              !!user && c.dislikes.some((did) => did.toString() === user._id);
            const displayText = translatedTexts[c._id] || c.commentbody;
            const isTranslated = !!translatedTexts[c._id];

            return (
              <div key={c._id} className="flex gap-4">
                <Avatar className="w-9 h-9 flex-shrink-0">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>{c.usercommented?.[0] || "?"}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm">{c.usercommented}</span>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(c.commentedon))} ago
                    </span>
                    {c.city && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        📍 {c.city}
                      </span>
                    )}
                  </div>

                  {/* Body – edit mode or display mode */}
                  {editingCommentId === c._id ? (
                    <div className="space-y-2 mt-1">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      {SPECIAL_CHAR_REGEX.test(editText) && (
                        <p className="text-xs text-red-500">Special characters not allowed.</p>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={handleUpdateComment}
                          disabled={!editText.trim() || SPECIAL_CHAR_REGEX.test(editText)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditingCommentId(null); setEditText(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm mt-1 leading-relaxed break-words">{displayText}</p>

                      {isTranslated && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">
                          Translated ·{" "}
                          <button
                            className="underline hover:text-gray-600"
                            onClick={() => clearTranslation(c._id)}
                          >
                            Show original
                          </button>
                        </p>
                      )}

                      {/* Action row */}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-500">

                        {/* Like */}
                        <button
                          onClick={() => handleLike(c._id)}
                          title="Like"
                          className={`flex items-center gap-1.5 text-sm hover:text-blue-600 transition-colors ${
                            userLiked ? "text-blue-600 font-semibold" : ""
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {c.likes.length > 0 && (
                            <span className="text-xs">{c.likes.length}</span>
                          )}
                        </button>

                        {/* Dislike */}
                        <button
                          onClick={() => handleDislike(c._id)}
                          title="Dislike (auto-removed at 2 dislikes)"
                          className={`flex items-center gap-1.5 text-sm hover:text-red-500 transition-colors ${
                            userDisliked ? "text-red-500 font-semibold" : ""
                          }`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          {c.dislikes.length > 0 && (
                            <span className="text-xs">{c.dislikes.length}</span>
                          )}
                        </button>

                        {/* Translate */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenTranslateMenu(
                                openTranslateMenu === c._id ? null : c._id
                              )
                            }
                            title="Translate comment"
                            className="flex items-center gap-1.5 text-sm hover:text-green-600 transition-colors"
                          >
                            <Languages className="w-3.5 h-3.5" />
                            <span className="text-xs">
                              {translatingId === c._id ? "…" : "Translate"}
                            </span>
                          </button>

                          {/* Language dropdown */}
                          {openTranslateMenu === c._id && (
                            <div className="absolute left-0 top-7 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36">
                              {LANGUAGES.map((lang) => (
                                <button
                                  key={lang.code}
                                  onClick={() =>
                                    handleTranslate(c._id, c.commentbody, lang.code)
                                  }
                                  className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  {lang.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Edit / Delete – own comments only */}
                        {c.userid === user?._id && (
                          <>
                            <button
                              onClick={() => handleEdit(c)}
                              className="text-xs hover:text-gray-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              className="text-xs hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;

