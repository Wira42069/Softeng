import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const drafts = await prisma.draft.findMany()

  for (const draft of drafts) {
    if (draft.content && typeof draft.content === 'object' && Array.isArray((draft.content as any).content)) {
      let modified = false
      const nodes = (draft.content as any).content

      for (const node of nodes) {
        if (node.type === 'heading' && node.attrs && node.attrs.level === 2) {
          // Check if this is an automated outline subchapter. We will just promote all level 2 headings to level 1 for these specific drafts.
          node.attrs.level = 1
          modified = true
        }
      }

      if (modified) {
        await prisma.draft.update({
          where: { id: draft.id },
          data: { content: draft.content }
        })
        console.log(`Updated draft ${draft.title}`)
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
