import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';
import {headers} from 'next/headers';

const locales = ['en', 'pt'];

export default getRequestConfig(async ({locale}) => {
  let resolvedLocale = locale;

  if (!resolvedLocale) {
    try {
      const reqHeaders = await headers();
      const path = reqHeaders.get("x-invoke-path") || reqHeaders.get("next-url") || "";
      if (path.startsWith("/pt")) resolvedLocale = "pt";
      else resolvedLocale = "en";
    } catch (e) {
      resolvedLocale = "en";
    }
  }

  if (!locales.includes(resolvedLocale as any)) {
    notFound();
  }

  return {
    locale: resolvedLocale as string,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default
  };
});
