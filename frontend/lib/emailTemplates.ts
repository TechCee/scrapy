/**
 * Sales email templates for "Send email" from contact actions.
 * Placeholders: [First Name], [Company Name]
 */
export interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "culture_first",
    label: "Culture First Empathetic",
    subject: "The gap between your people strategy and what your teams actually feel",
    body: `Hi [First Name],

Building a positive culture is one of the hardest things to do well, not because people do not care, but because the right conditions for honest, regular feedback rarely exist.

I built Trustle to try and close that gap.

It is a private platform where teams give each other short, structured reviews as a regular habit. Not once a year. Not in a formal setting. Just an ongoing, low-pressure way of saying: I see you, I appreciate this, here is what would help me.

Over time, the analytics layer builds a picture that is genuinely hard to get any other way:

•  How recognition is distributed across your teams
•  Which members are most encouraging and who may need more support
•  Where sentiment has been quietly drifting
•  How the overall health of your circles is trending week on week

For people leaders, it gives you the early signal you need to act before disengagement becomes a departure. For employees, it gives them the experience of being genuinely seen, which, in our experience, changes how people show up.

I would like to offer your organisation a complimentary three-month trial, with full access to the enterprise analytics and a personalised onboarding session. No cost, no lengthy sign-up process, just a chance to see whether it adds value for your teams.

If you are open to a short conversation, I would love to hear how your organisation currently approaches internal feedback and culture, and share a bit more about how Trustle might support that.

Either way, thank you for the work you do in this space. It matters more than most people realise.

Warm regards,
Clive
Founder, Trustle
trustle.online`,
  },
  {
    id: "direct_results",
    label: "Direct Results Focused",
    subject: "Free 3-month trial for [Company Name], building trust across your teams",
    body: `Hi [First Name],

I will keep this brief because I know your time is limited.

I run Trustle, a platform that helps organisations understand how trust and culture are actually tracking across their teams, not through annual surveys, but through a simple, ongoing feedback habit that people genuinely use.

Here is what it does in practice:

•  Teams give each other short, private structured reviews on a regular basis
•  Analytics surface who is thriving, who is disengaging, and where recognition gaps exist
•  Sentiment Drift alerts you to shifts in team mood before they become a people problem
•  Multi-team dashboards give you a real-time view of culture across departments

For organisations where culture, retention, and employee wellbeing matter, it fills a gap that most HR tools do not touch: the space between formal reviews, where most of the real dynamics actually live.

I would like to offer [Company Name] a free three-month trial with full access to our enterprise analytics, no cost, no commitment, no procurement process required to get started.

Would it be worth a 20-minute call to explore whether it could be useful for your teams? I am happy to work around your schedule.

Best,
Clive
Founder, Trustle
trustle.online`,
  },
  {
    id: "warm_story",
    label: "Warm Story Led",
    subject: "A different way to look after your people",
    body: `Hi [First Name],

I hope this finds you well. I wanted to reach out because what you do, looking after the people behind an organisation, is exactly the problem I have spent the last couple of years trying to solve.

I built Trustle after watching good people go unnoticed in teams. Not because anyone was careless, but because there was never a simple, private way to tell someone they were appreciated, or to spot who was quietly disengaging before it became a real problem. Feedback either never happened, or arrived too late to matter.

Trustle gives your teams a private circle where members give each other short, structured reviews on a regular basis. It is not a performance management tool and it is not another HR platform. It is something much simpler: a habit of checking in with each other, with analytics that surface what you would never otherwise see.

Over time, you start to see things like:

•  Who is consistently recognised and who is being overlooked
•  Where sentiment is drifting before it becomes a retention issue
•  Which teams have the strongest culture and which need support
•  How trust and engagement are trending across your organisation

The goal is to help you build a genuinely positive culture from the inside out, not through surveys that happen once a year, but through something your people actually use.

I would love to offer [Company Name] a free three-month trial across one or more of your teams, with no commitment and no credit card required. You would have full access to the Pro analytics, and I would be on hand personally to help you get the most out of it.

If any of this resonates, I would genuinely welcome a short conversation. Even just a reply telling me it is not the right time is helpful. I am building this one conversation at a time and every piece of feedback matters.

Thank you for reading this far.

Clive
Founder, Trustle
trustle.online`,
  },
];

/** Replace [First Name] and [Company Name] in subject and body. */
export function fillEmailTemplate(
  template: EmailTemplate,
  firstName: string,
  companyName: string
): { subject: string; body: string } {
  const first = firstName || "there";
  const company = companyName || "your organisation";
  return {
    subject: template.subject.replace(/\[First Name\]/g, first).replace(/\[Company Name\]/g, company),
    body: template.body.replace(/\[First Name\]/g, first).replace(/\[Company Name\]/g, company),
  };
}

/** Build mailto: URL (opens native mail app). To = recipient email. Use encodeURIComponent for subject/body so spaces become %20 (plain text). Use CRLF for line breaks so clients like Zoho Mail show proper paragraphs. */
export function buildMailtoUrl(to: string, subject: string, body: string): string {
  const bodyWithCrLf = body.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyWithCrLf)}`;
}
