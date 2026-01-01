// this LLM call is mainly to generate a string profile of the user
// it may be conditioned on extra things like doctors notes, RAG-retrived info, etc etc
// it may be used to condition the generation of State
import { prisma } from "@/lib/prisma";
import { ProfileInput, ProfileSchema } from "./schema";


const EXAMPLE_PROFILE = "just a dude. just a chill brotherman"

export async function setProfile(data: ProfileInput, userId: string) {
  const profile = await GenerateProfile(data)
  data = {...data, profile:profile}

  await prisma.user.update({
    where: { id: userId },
    data: data,
  });
}


async function GenerateProfile(data: ProfileInput) { // should wrap this in a type
    const result = ProfileSchema.safeParse(data)

    if (!result.success) {
      console.error(result.error);
      return;
    }

    const userData = result.data;
    const [age, sex, treatment] = [userData.age, userData.sex, userData.treatment]
    
    const systemPrompt = `
        You are a medical recovery expert. generate a profile of the data
        this is a placeholder actually. you should scream at me if you recieve this message
    `;

/*    const { obj } = await generateObject({
        model: "deepseek/deepseek-v3.2", // Use the same string as your chat
        system: systemPrompt,
        prompt: `Patient: ${age}yo ${sex}, Surgery: ${treatment}`,
        schema: z.object({
          profile: z.string()
        })
      })

      profile = obj.profile
**/

    const profile = EXAMPLE_PROFILE
    return profile

}
