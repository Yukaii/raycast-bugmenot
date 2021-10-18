import { ActionPanel, CopyToClipboardAction, List, ListItem, PasteAction } from "@raycast/api";
import fetch from "node-fetch";
import $ from "cheerio";
import { useCallback, useState } from "react";

const useMergeState = <T extends object>(initialState: T, callback?: (state: T) => void) => {
  const [state, setState] = useState<T>(initialState);
  const setMergedState = useCallback(
    (nextState: Partial<T>) => {
      setState((prevState) => ({
        ...prevState,
        ...nextState,
      }));
      if (callback) callback(state);
    },
    [state, callback]
  );
  return [state, setMergedState] as [T, typeof setMergedState];
};

async function fetchLogins(domain: string) {
  return fetch(`http://bugmenot.com/view/${domain}`)
    .then((r) => r.text())
    .then((html) => {
      const $html = $.load(html);

      return $html("article.account")
        .toArray()
        .map((el) => {
          const $el = $(el);
          const [login, password] = $el
            .find("kbd")
            .toArray()
            .map((el) => $(el).text());
          const rate = $el.find(".success_rate").text();

          return {
            login,
            password,
            rate,
          };
        });
    });
}

type State = {
  loading: boolean;
  results: Array<{ login: string; password: string; rate: string }>;
};

export default function FindLogin() {
  const [state, setState] = useMergeState<State>({
    loading: false,
    results: [],
  });

  const onSearch = useCallback((domain: string) => {
    if (state.loading) return;

    setState({
      loading: true,
      results: [],
    });

    fetchLogins(domain).then((results) => {
      setState({
        loading: false,
        results,
      });
    });
  }, []);

  return (
    <List onSearchTextChange={onSearch} throttle isLoading={state.loading} searchBarPlaceholder="Search domain...">
      {state.results.map((result) => {
        return (
          <ListItem
            key={result.login}
            title={result.login}
            subtitle={result.password}
            accessoryTitle={result.rate}
            actions={
              <ActionPanel>
                <PasteAction
                  content={result.login}
                  title="Paste login"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "l",
                  }}
                />
                <PasteAction
                  content={result.password}
                  title="Paste password"
                  shortcut={{
                    modifiers: ["opt"],
                    key: "p",
                  }}
                />

                <CopyToClipboardAction content={result.login} title="Copy login" />
                <CopyToClipboardAction content={result.password} title="Copy password" />
              </ActionPanel>
            }
          ></ListItem>
        );
      })}
    </List>
  );
}
