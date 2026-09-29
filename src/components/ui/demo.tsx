import { useState } from "react";
import { ProfileSelector, ProfileIcon } from "@/components/ui/profile-selector";
import { Plus } from "lucide-react";
/** Isolated preview; production uses real teams and invitations, never sample profiles. */
export default function ProfileSelectorDemo() {
  const [selected, setSelected] = useState<string | null>(null);
  const profiles = [
    {
      id: "Ravi",
      label: "Ravi",
      icon: "https://cdn.21st.dev/assets/mirror/c9/c9babfd70e9056d8223e9d2eda28c4c7cc6c3555d666e10ef656b70a49f67a48.png",
    },
    {
      id: "vaib",
      label: "Vaib",
      icon: "https://cdn.21st.dev/assets/mirror/07/0751fdebf5247cf9eb922b8e04e61adc56845770aa86e5c96268150aa6e0c1c7.jpg",
    },
    {
      id: "kids",
      label: "Kids",
      icon: "https://cdn.21st.dev/assets/mirror/b5/b53ee43974b480634d03d5bd5a4244aba56f7ef731c244fbef72747494732047.jpg",
    },
    {
      id: "add",
      label: "Add",
      icon: (
        <ProfileIcon className="bg-foreground/5">
          <Plus className="h-12 w-12 text-muted-foreground" />
        </ProfileIcon>
      ),
    },
  ];
  return (
    <>
      <ProfileSelector
        profiles={profiles}
        selectedId={selected}
        onProfileSelect={setSelected}
      />
      <p role="status">
        {selected === "add"
          ? "Create a new profile"
          : selected
            ? `Selected: ${selected}`
            : ""}
      </p>
    </>
  );
}
