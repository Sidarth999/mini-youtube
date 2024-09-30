import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {deleteOnCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"


//TODO: get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
})

// TODO: get video, upload to cloudinary, create video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    
    if([title, description].some((field) => field.trim()==="")){
        throw new ApiError(400, "Both title and description is required to publish a video")   
    }
    
    const videoFileLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoFileLocalPath){
        throw new ApiError(400, "video file is required")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "video file is required")
    }

    const videoFile =  await uploadOnCloudinary(videoFileLocalPath)

    const thumbnail =  await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(400, "Video file not found")
    }

    if(!thumbnail){
        throw new ApiError(400, "Thumbnail not found")
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id,
        isPublished: true,
    })

    const videoUploaded = await Video.findById(video?._id)

    if(!videoUploaded){
        throw new ApiError(500, "video upload failed, please try again !!!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video Uploaded successfully"
        )
    )

})

//TODO: get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    if(!isValidObjectId(req.user?._id)){
        throw new ApiError(400, "Invalid user ID")
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    $if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else : false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        $if:{
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else : false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url" : 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1, // (Due this error may occur)
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])

    if(!video){
        throw new ApiError(500, "Failed to fetch video")
    }

    // Increment views if video is fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    })

    // Add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id,{
        $addToSet: {
            watchHistory: videoId
        }
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video[0], 
            "Video details fetched successfully"
        )
    )
})

//TODO: update video details like title, description, thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    if(!(title && description)){
        throw new ApiError(400, "Both title and description is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "No video found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can edit the video")
    }

    // deleting old thumbnail and updating with new one
    const thumbnailToDelete = video.thumbnail.public_id

    const thumbnailLocalPath = req.file?.path

    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required")
    }
    
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnail){
        throw new ApiError(500, "Failed to upload thumbnail, Please try again !!!")
    }

    const updatedVideo = Video.findByIdAndUpdate(videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        {new: true}
    )

    if(!updatedVideo){
        throw new ApiError(500, "Failed to update video, please try again !!!")
    }

    if(updatedVideo){
        await deleteOnCloudinary(thumbnailToDelete)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            updatedVideo,
            "Video updated successfully"
        )
    )
})

//TODO: delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can delete their video")
    }

    const deletedVideo = await Video.findByIdAndDelete(video?._id)

    if(!deletedVideo){
        throw new ApiError(500, "Failed during deleting the video, please try again !!!")
    }

    await deleteOnCloudinary(video.videoFile.public_id, "video")
    await deleteOnCloudinary(video.thumbnail.public_id)

    // delete video likes
    await Like.deleteMany({
        video: videoId
    })

    // delete video comments
    await Comment.deleteMany({
        video: videoId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400, "Video not found")
    }

    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "Only owner can toggle publish status on their video")
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {new : true}
    )

    if(!toggledVideoPublish){
        throw new ApiError(500, "Failed to toggle video publish status, please try again !!!")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isPublished : toggledVideoPublish.isPublished},
            "Toggled video publish status successfully"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
