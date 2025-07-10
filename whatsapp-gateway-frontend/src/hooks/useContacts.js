import { useState, useEffect } from "react";
import { generateId } from "../utils/helpers";

export const useContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [currentEditingContactId, setCurrentEditingContactId] = useState(null);
  const [currentEditingGroupId, setCurrentEditingGroupId] = useState(null);
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState(
    new Set()
  );

  // Contact management functions
  const saveContact = (contactData) => {
    if (currentEditingContactId) {
      // Update existing contact
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === currentEditingContactId
            ? { ...contactData, id: currentEditingContactId }
            : contact
        )
      );
      setCurrentEditingContactId(null);
    } else {
      // Add new contact
      const newContact = { ...contactData, id: generateId() };
      setContacts((prev) => [...prev, newContact]);
    }
  };

  const deleteContact = (contactId) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  const editContact = (contactId) => {
    setCurrentEditingContactId(contactId);
    return contacts.find((c) => c.id === contactId);
  };

  const clearContactForm = () => {
    setCurrentEditingContactId(null);
  };

  // Group management functions
  const saveGroup = (groupData) => {
    if (currentEditingGroupId) {
      // Update existing group (change group name for all contacts)
      const oldGroupName = currentEditingGroupId;
      const newGroupName = groupData.name;

      // Update all contacts that had the old group name
      setContacts((prev) =>
        prev.map((contact) =>
          contact.group === oldGroupName ? { ...contact, group: "" } : contact
        )
      );

      // Assign new group name to selected contacts
      setContacts((prev) =>
        prev.map((contact) =>
          groupData.contacts.includes(contact.id)
            ? { ...contact, group: newGroupName }
            : contact
        )
      );

      setCurrentEditingGroupId(null);
    } else {
      // Create new group - assign group name to selected contacts
      setContacts((prev) =>
        prev.map((contact) =>
          groupData.contacts.includes(contact.id)
            ? { ...contact, group: groupData.name }
            : contact
        )
      );
    }
  };

  const deleteGroup = (groupName) => {
    // Remove group from all contacts
    setContacts((prev) =>
      prev.map((contact) =>
        contact.group === groupName ? { ...contact, group: "" } : contact
      )
    );
  };

  const getUniqueGroups = () => {
    return [
      ...new Set(contacts.filter((c) => c.group).map((c) => c.group)),
    ].sort();
  };

  const getGroupStats = () => {
    const uniqueGroups = getUniqueGroups();
    const contactsInGroups = contacts.filter((c) => c.group).length;
    const ungroupedContacts = contacts.filter((c) => !c.group).length;

    return {
      totalGroups: uniqueGroups.length,
      contactsInGroups,
      ungroupedContacts,
    };
  };

  // Template processing
  const processTemplate = (content, contactId = null) => {
    let processedContent = content;

    if (contactId) {
      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        // Basic contact variables
        processedContent = processedContent.replace(/\{nama\}/g, contact.name);
        processedContent = processedContent.replace(
          /\{telepon\}/g,
          contact.phone
        );

        // Category-based variables
        if (contact.category) {
          processedContent = processedContent.replace(
            /\{kategori\}/g,
            contact.category
          );
        } else {
          processedContent = processedContent.replace(/\{kategori\}/g, "");
        }

        // Group-based variables
        if (contact.group) {
          processedContent = processedContent.replace(
            /\{group\}/g,
            contact.group
          );
          processedContent = processedContent.replace(
            /\{grup\}/g,
            contact.group
          );
        } else {
          processedContent = processedContent.replace(/\{group\}/g, "");
          processedContent = processedContent.replace(/\{grup\}/g, "");
        }
      }
    }

    // Common variables with default values
    processedContent = processedContent.replace(
      /\{tanggal\}/g,
      new Date().toLocaleDateString("id-ID")
    );
    processedContent = processedContent.replace(
      /\{waktu\}/g,
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    processedContent = processedContent.replace(
      /\{hari\}/g,
      new Date().toLocaleDateString("id-ID", { weekday: "long" })
    );

    return processedContent;
  };

  return {
    contacts,
    setContacts,
    groups,
    setGroups,
    currentEditingContactId,
    setCurrentEditingContactId,
    currentEditingGroupId,
    setCurrentEditingGroupId,
    selectedContactsForGroup,
    setSelectedContactsForGroup,
    saveContact,
    deleteContact,
    editContact,
    clearContactForm,
    saveGroup,
    deleteGroup,
    getUniqueGroups,
    getGroupStats,
    processTemplate,
  };
};
