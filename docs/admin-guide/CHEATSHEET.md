# Admin cheat sheet

One page. Pin it up. The long version, with screenshots, is in [README.md](README.md).

## Where things are

| I want to | Go to |
|---|---|
| Add or edit a page | Content → Pages |
| Publish news, a story, a job, a report | Posts → the matching kind |
| Upload or find a file | Content → Media |
| Put a page in the top menu | Site → Header |
| Change the footer | Site → Footer |
| Change the site name, logo, contact details | Site → Settings |
| Change a button label or a message the site shows | Site → UI Strings |
| Let a colleague sign in | Site → Users, then Site → Roles |
| Read what visitors sent | Messages |
| Collect answers from visitors | Forms |
| Turn a whole area off | Site → Modules |
| Jump to any screen | **Ctrl K**, type a few letters, Enter |
| Be walked through the screen I am on | **Tour**, in the topbar. `N` forward, `P` back, Esc out |

## Publishing a page

1. Pages → **New page**
2. **Metadata** panel: Title and Brief, in both language tabs
3. **Page settings** panel: Parent page and URL segment
4. **+ Add section** for each block of the page
5. Status → **Published**
6. **Save page**
7. **View site** and look at it

The address is the parent plus the URL segment: parent `who-we-are` + segment `history` →
`/who-we-are/history`.

Sections come in two kinds. **Static** holds what you type. **Dynamic** pulls in posts, projects or
people and keeps itself up to date, so a Post list on a page picks up next month's news with nobody
editing the page.

## Publishing a post

1. Posts → pick the kind **first** — it decides where the post appears
2. **New post**
3. Title, excerpt, body; cover image and status on the right
4. Both language tabs
5. Status → **Published**, save, look at it

## Editor toolbar

Bold · Italic · Heading 2 · Heading 3 · Bulleted list · Quote · Link · **Image** · **Table** ·
Terms · **Form** · Undo · Redo

Image opens the media library. Form drops one of your forms into the article.

## Media

- **Upload** in the header, or **drag files onto the page**
- Chips: All · Images · Videos · Files. Files means "not an image", so videos answer it too
- Search matches the stored name and the address
- Click a tile → **Used in** tells you what points at it, with an Open button for each
- "Unused" means safe to delete
- A file written into article text **cannot** be deleted until you remove it there
- A file used only as a cover or logo **can** be deleted, and that record is left without a picture

## The rules people forget

- **Draft is invisible.** Nothing is public until Status is Published.
- **Creating a page does not put it in the menu.** Site → Header does.
- **Menu items save one at a time.** The Save button on that screen is only for the header settings
  above the menu.
- **Blank stays blank.** A field left empty on one language tab is empty on that language's site.
- **An empty UI string is not blank.** It shows the shipped default. Clearing a box you changed puts
  that default back.
- **Messages does not email anyone.** Someone has to open it. Reply opens your own mail program.
- **A short sidebar is normal.** You see your role's areas, and only the modules that are on.
- **A term in use cannot be deleted.** The refusal counts the records holding it.
- **Look at the public page.** Saving is not the last step.
