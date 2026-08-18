import { Link, type LinkComponentProps } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
	href?: string | null;
	children?: ReactNode;
	/** Active on this path alone, so an ancestor link is not "the current page". */
	exact?: boolean;
};

export function NavLink({ href, children, exact, ...rest }: Props) {
	if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) {
		return (
			<a href={href ?? undefined} {...rest}>
				{children}
			</a>
		);
	}
	// a resolved path is a valid runtime target but not in the authored-route union
	return (
		<Link
			to={href as LinkComponentProps<"a">["to"]}
			{...(exact ? { activeOptions: { exact: true } } : {})}
			{...rest}
		>
			{children}
		</Link>
	);
}
