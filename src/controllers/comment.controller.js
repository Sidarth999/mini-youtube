import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // get video id on which comment is to be added from params
    // Get comment content
    // Check whether is loggend in or not (this will be checked using verifyJWT using middleware)
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "Video not found");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!comment) {
        throw new ApiError(500, "Failed to add comment in video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "Content needed to update comment");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(400, "Comment not found");
    }

    if (comment?.owner.toString() != req.user?._id.toString()) {
        throw new ApiError(400, "Only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(
            500,
            "Unable to edit the comment, Please try again !!!"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError("Comment not found");
    }

    if (comment?.owner.toString() != req.user?._id.toString()) {
        throw new ApiError("Only the owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, { commentId }, "Comment deleted successfully")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
