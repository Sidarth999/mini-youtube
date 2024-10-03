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

//TODO: get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url" : 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description : 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished : 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1
                    }
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            likedVideosAggregate,
            "Liked videos fetched successfully"
        )
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}