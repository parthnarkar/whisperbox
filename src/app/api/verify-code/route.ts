import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import { z } from 'zod'
import { verifyCodeSchema } from "@/schemas/verifyCodeSchema";

const VerifyCodeSchema = z.object({
    code: verifyCodeSchema,
})

export async function POST(request: Request) {
    await dbConnect()

    try {
        const { username, code } = await request.json()

        // validate with zod
        const resultOfZod = VerifyCodeSchema.safeParse(code);
        console.log(resultOfZod);

        if (!resultOfZod.success) {
            const zodErrors = z.treeifyError(resultOfZod.error);

            const verifyCodeZodErrors: string[] = zodErrors.properties?.code?.errors || [];

            return Response.json({
                success: false,
                message: verifyCodeZodErrors
            }, { status: 500 })
        }

        const decodedUsername = decodeURIComponent(username);
        const user = await UserModel.findOne({ username: decodedUsername })

        if (!user) {
            return Response.json({
                success: false,
                message: "User not found"
            }, {
                status: 500
            })
        }

        const isCodeValid = user.verifyCode === code
        const isCodeNotExpired = new Date(user.verifyCodeExpiry) > new Date();

        if (isCodeValid && isCodeNotExpired) {
            user.isVerified = true;
            await user.save();
            return Response.json({
                success: true,
                message: "User Verified"
            }, {
                status: 200
            })
        }
        else if (!isCodeNotExpired) {
            return Response.json({
                success: false,
                message: "Verification code has expired, please signup again to get a new code"
            }, {
                status: 400
            })
        }
        else {
            return Response.json({
                success: false,
                message: "Incorrect verification code"
            }, {
                status: 400
            })
        }

    } catch (error) {
        console.error("Error verifying user", error);
        return Response.json({
            success: false,
            message: "Error verifying user"
        }, {
            status: 500
        })
    }
}

