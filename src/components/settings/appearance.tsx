import { useTranslation } from "react-i18next";
import { Languages, Palette, Sun, Moon, SunMoon } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { changeLanguage, languages, Language } from "@/i18n";
import { themes, Theme } from "@/theme";

const uiSchema = z.object({
  language: z.enum(languages),
  theme: z.enum(themes),
});

function UILanguage({ lang }: { lang: Language }) {
  const { i18n } = useTranslation();
  const displayName = new Intl.DisplayNames([i18n.language], {
    type: "language",
  });
  return <span className="capitalize">{displayName.of(lang)}</span>;
}

function UITheme({ theme }: { theme: "light" | "dark" | "system" }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row items-center gap-1">
      {theme === "light" ? (
        <Sun className="size-4 text-muted-foreground" />
      ) : theme === "dark" ? (
        <Moon className="size-4 text-muted-foreground" />
      ) : (
        <SunMoon className="size-4 text-muted-foreground" />
      )}
      <span>
        {theme === "light"
          ? t("settings.ui.theme.light")
          : theme === "dark"
            ? t("settings.ui.theme.dark")
            : t("settings.ui.theme.system")}
      </span>
    </div>
  );
}

export function Appearance() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const language = i18n.language as Language;
  const form = useForm<z.infer<typeof uiSchema>>({
    resolver: zodResolver(uiSchema),
    defaultValues: {
      language,
      theme,
    },
  });

  function onSubmit() {
    console.log("submit");
  }

  function changeTheme(newTheme: "light" | "dark" | "system") {
    setTheme(newTheme);
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <Languages className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.ui.language.title")}
            </h4>
          </div>
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select
                    onValueChange={(props: Language) => {
                      field.onChange(props);
                      changeLanguage(props);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "settings.ui.language.select-placeholder",
                          )}
                        >
                          <UILanguage lang={language} />
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          <UILanguage lang={lang} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-row gap-1 items-center flex-wrap">
            <Palette className="size-4 text-muted-foreground" />
            <h4 className="text-sm uppercase font-light text-muted-foreground">
              {t("settings.ui.theme.title")}
            </h4>
          </div>
          <FormField
            control={form.control}
            name="theme"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Select
                    onValueChange={(props: Theme) => {
                      field.onChange(props);
                      changeTheme(props);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "settings.ui.theme.select-placeholder",
                          )}
                        >
                          <UITheme theme={theme} />
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {themes.map((theme) => (
                        <SelectItem key={theme} value={theme}>
                          <UITheme theme={theme} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </form>
    </Form>
  );
}
