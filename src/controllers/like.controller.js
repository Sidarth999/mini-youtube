import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    // check valid videoID
    // user must be logged in
    // check like model / document

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Video ID is invalid");
    }

    const alreadyLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id 
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        return res
        .status(200)
        .json(new ApiResponse(200,{isLiked: false}, "Already Liked so, now its unliked"))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    }) 

    return res
    .status(200)
    .json(new ApiResponse(200,{isLiked : true}, "Video Liked Successfully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Comment Id is invalid")
    }

    const alreadyLiked = await Like.findOne({
            comment : commentId,
            likedBy : req.user?._id
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}, "Already Liked so, now its unliked"))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200,{isLiked: true}, "Video Liked Successfully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetID")
    }

    const alreadyLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: false}, "Already Liked so, now its unliked"))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}, "Video Liked Successfully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}