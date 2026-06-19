import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string | null; children?: ReactNode };

/**
 * Internal links navigate client-side (SPA, with the router's View Transition);
 * external/hash/mailto/tel and empty hrefs fall back to a plain anchor. Drop-in
 * replacement for `<a href>` across the public site.
 */
export function NavLink({ href, children, ...rest }: Props) {
	if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) {
		return (
			<a href={href ?? undefined} {...rest}>
				{children}
			</a>
		);
	}
	// `to` accepts a fully-resolved path string at runtime; the router matches it
	// against the route tree (the `$` splat for content, explicit functional routes).
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (
		<Link to={href as any} {...(rest as any)}>
			{children}
		</Link>
	);
}
